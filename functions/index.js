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
  if (typeof code !== "string" || !/^\d{4,8}$/.test(code)) return false;
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
      const codeMatches = Boolean(
        company &&
        company.active !== false &&
        await verifyScryptCode(code, company.accessCodeSalt, company.accessCodeHash)
      );

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
