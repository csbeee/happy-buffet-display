const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);

initializeApp();
const db = getFirestore();

const CODE_ATTEMPT_LIMIT = 8;
const CODE_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const TICKET_TTL_MS = 5 * 60 * 1000;

function cleanString(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function verifyScryptCode(code, salt, expectedHash) {
  if (typeof code !== "string" || !/^(?:\d{3}|\d{4,8})$/.test(code)) return false;
  if (typeof salt !== "string" || salt.length < 16) return false;
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{128}$/i.test(expectedHash)) return false;

  const actual = await scrypt(code, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

/**
 * Validate a selected company code and issue a short-lived, one-time ticket.
 *
 * Expected company fields:
 *   active: boolean
 *   accessCodeSalt: random salt (hex)
 *   accessCodeHash: scrypt(code, salt, 64).toString("hex")
 *
 * This function deliberately does not write any meal count. A later submission
 * function must consume the ticket transactionally and validate the signature,
 * headcount, and idempotency key before creating a billable entry.
 */
exports.verifyCompanyCode = onCall(
  { enforceAppCheck: true, maxInstances: 10, timeoutSeconds: 15 },
  async (request) => {
    const companyId = cleanString(request.data?.companyId, 128);
    const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";

    if (!companyId || !/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) {
      throw new HttpsError("invalid-argument", "거래처를 다시 선택해 주세요.");
    }
    if (!/^\d{4,8}$/.test(code)) {
      throw new HttpsError("invalid-argument", "확인 코드를 확인해 주세요.");
    }

    // Rate limit key is derived from the client IP; the raw IP is not stored.
    const ip = cleanString(request.rawRequest?.ip, 100) || "unknown";
    const attemptId = hashKey(companyId + ":" + ip);
    const attemptRef = db.collection("companyCodeAttempts").doc(attemptId);
    const companyRef = db.collection("companies").doc(companyId);

    // Generate the ticket once outside the transaction so transaction retries
    // cannot return different tickets from the same invocation.
    const ticket = crypto.randomBytes(32).toString("base64url");
    const ticketRef = db.collection("companyAccessTickets").doc(hashKey(ticket));
    const now = Date.now();

    const result = await db.runTransaction(async (tx) => {
      const [companySnap, attemptSnap] = await Promise.all([
        tx.get(companyRef),
        tx.get(attemptRef)
      ]);

      const attemptData = attemptSnap.exists ? attemptSnap.data() : {};
      const windowStartedAt = attemptData.windowStartedAt?.toMillis?.() ?? 0;
      const isSameWindow = now - windowStartedAt < CODE_ATTEMPT_WINDOW_MS;
      const failedAttempts = isSameWindow ? Number(attemptData.failedAttempts || 0) : 0;
      const blockedUntil = attemptData.blockedUntil?.toMillis?.() ?? 0;

      if (blockedUntil > now || failedAttempts >= CODE_ATTEMPT_LIMIT) {
        return { ok: false, blocked: true };
      }

      const company = companySnap.exists ? companySnap.data() : null;
      const ledgerCodeMatches = Boolean(
        company &&
        /^\\d{3}$/.test(String(company.ledgerNumber ?? "")) &&
        code === String(company.ledgerNumber)
      );
      const legacyCodeMatches = Boolean(
        company &&
        await verifyScryptCode(code, company.accessCodeSalt, company.accessCodeHash)
      );
      const codeMatches = Boolean(company && company.active !== false && (ledgerCodeMatches || legacyCodeMatches));

      if (!codeMatches) {
        const nextFailedAttempts = failedAttempts + 1;
        tx.set(attemptRef, {
          companyId,
          failedAttempts: nextFailedAttempts,
          windowStartedAt: isSameWindow ? attemptData.windowStartedAt : Timestamp.fromMillis(now),
          blockedUntil: nextFailedAttempts >= CODE_ATTEMPT_LIMIT
            ? Timestamp.fromMillis(now + CODE_ATTEMPT_WINDOW_MS)
            : null,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { ok: false, blocked: false };
      }

      tx.create(ticketRef, {
        companyId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + TICKET_TTL_MS),
        usedAt: null,
        appId: cleanString(request.app?.appId, 200) || null
      });

      return { ok: true };
    });

    if (!result.ok && result.blocked) {
      throw new HttpsError("resource-exhausted", "확인 시도가 많습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (!result.ok) {
      throw new HttpsError("permission-denied", "거래처 또는 확인 코드를 확인해 주세요.");
    }

    return {
      ok: true,
      ticket,
      companyId,
      expiresInSeconds: Math.floor(TICKET_TTL_MS / 1000)
    };
  }
);

/**
 * Persist one verified visit group. Tickets are short-lived and consumed once.
 * The Admin SDK bypasses Firestore client rules; all input validation is therefore
 * performed here before a billable meal entry is written.
 */
exports.submitMealEntry = onCall(
  { enforceAppCheck: true, maxInstances: 10, timeoutSeconds: 20 },
  async (request) => {
    const data = request.data || {};
    const companyId = cleanString(data.companyId, 128);
    const ticket = cleanString(data.ticket, 256);
    const submissionId = cleanString(data.submissionId, 80);
    const representativeName = cleanString(data.representativeName, 40);
    const entryMode = cleanString(data.entryMode, 20);
    const groupNumber = Number(data.groupNumber);
    const headcount = Number(data.headcount);
    const rosterIds = Array.isArray(data.rosterIds)
      ? [...new Set(data.rosterIds.filter((id) => typeof id === "string").map((id) => id.slice(0, 160)))].slice(0, 500)
      : [];
    const signatureDataUrl = typeof data.signatureDataUrl === "string" ? data.signatureDataUrl : "";

    if (!companyId || !/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) {
      throw new HttpsError("invalid-argument", "거래처를 다시 선택해 주세요.");
    }
    if (!ticket || ticket.length < 32 || ticket.length > 256) {
      throw new HttpsError("permission-denied", "거래처 확인을 다시 진행해 주세요.");
    }
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(submissionId)) {
      throw new HttpsError("invalid-argument", "접수 식별값이 올바르지 않습니다. 다시 시도해 주세요.");
    }
    if (!representativeName || !["total", "roster", "mixed"].includes(entryMode)) {
      throw new HttpsError("invalid-argument", "대표자 이름 또는 입력 방식을 확인해 주세요.");
    }
    if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 100000) {
      throw new HttpsError("invalid-argument", "방문 그룹 번호가 올바르지 않습니다.");
    }
    if (!Number.isInteger(headcount) || headcount < 1 || headcount > 500) {
      throw new HttpsError("invalid-argument", "식수 인원은 1~500명이어야 합니다.");
    }
    if (entryMode === "roster" && rosterIds.length !== headcount) {
      throw new HttpsError("invalid-argument", "명단 선택 인원과 식수 인원이 일치하지 않습니다.");
    }
    if (entryMode === "mixed" && rosterIds.length > headcount) {
      throw new HttpsError("invalid-argument", "명단 인원이 총 식수보다 많습니다.");
    }
    if (!signatureDataUrl.startsWith("data:image/png;base64,") || signatureDataUrl.length > 200000) {
      throw new HttpsError("invalid-argument", "대표자 서명을 확인해 주세요.");
    }

    const ticketRef = db.collection("companyAccessTickets").doc(hashKey(ticket));
    const companyRef = db.collection("companies").doc(companyId);
    const entryRef = db.collection("mealEntries").doc(submissionId);
    const now = Date.now();
    const nowKorea = new Date(now + 9 * 60 * 60 * 1000);
    const serviceDate = nowKorea.toISOString().slice(0, 10);
    const koreaHour = nowKorea.getUTCHours();
    const mealPeriod = koreaHour >= 16 ? "dinner" : "lunch";
    const counterRef = db.collection("mealEntryCounters").doc(`${companyId}_${serviceDate}_${mealPeriod}`);
    let savedGroupNumber = 0;

    await db.runTransaction(async (tx) => {
      const [ticketSnap, companySnap, existingEntry, counterSnap] = await Promise.all([
        tx.get(ticketRef), tx.get(companyRef), tx.get(entryRef), tx.get(counterRef)
      ]);
      if (existingEntry.exists) {
        throw new HttpsError("already-exists", "이미 접수된 기록입니다. 중복 접수하지 않았습니다.");
      }
      if (!ticketSnap.exists) {
        throw new HttpsError("permission-denied", "확인 정보가 만료되었습니다. 거래처 확인을 다시 해 주세요.");
      }
      const ticketData = ticketSnap.data();
      const expiresAt = ticketData.expiresAt?.toMillis?.() ?? 0;
      if (ticketData.companyId !== companyId || ticketData.usedAt || expiresAt <= now) {
        throw new HttpsError("permission-denied", "확인 정보가 만료되었거나 이미 사용되었습니다. 다시 확인해 주세요.");
      }
      if (!companySnap.exists || companySnap.data().active === false) {
        throw new HttpsError("not-found", "거래처를 찾을 수 없거나 비활성 상태입니다.");
      }

      savedGroupNumber = Math.max(0, Number(counterSnap.exists ? counterSnap.data().lastGroupNumber : 0) || 0) + 1;
      tx.update(ticketRef, { usedAt: FieldValue.serverTimestamp() });
      tx.set(counterRef, {
        companyId,
        serviceDate,
        mealPeriod,
        lastGroupNumber: savedGroupNumber,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.create(entryRef, {
        companyId,
        companyName: cleanString(companySnap.data().name, 120),
        serviceDate,
        mealPeriod,
        groupNumber: savedGroupNumber,
        entryMode,
        headcount,
        rosterIds,
        representativeName,
        signatureDataUrl,
        submissionId,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        source: "meal-management-tablet",
        appId: cleanString(request.app?.appId, 200) || null
      });
    });

    return { ok: true, entryId: submissionId, serviceDate, mealPeriod, groupNumber: savedGroupNumber, status: "pending" };
  }
);
