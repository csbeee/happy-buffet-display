import { db } from "../firebase/firebase-config.js";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const searchInput = $("companySearch");
const companyGrid = $("companyGrid");
const favoriteGrid = $("favoriteCompanies");
const favoritesSection = $("favoritesSection");
const companyCount = $("companyCount");
const resultsHeading = $("resultsHeading");
const resultsCount = $("resultsCount");
const emptyState = $("emptyState");
const loadState = $("loadState");
const connectionState = $("connectionState");
const clearSearchButton = $("clearSearch");
const codePanel = $("codePanel");
const selectedCompanyName = $("selectedCompanyName");
const codeInput = $("companyCode");
const codeMessage = $("codeMessage");
const verifyCodeButton = $("verifyCodeButton");
const entryPanel = $("entryPanel");
const entryCompanyName = $("entryCompanyName");
const entryMode = $("entryMode");
const groupNumberInput = $("groupNumber");
const totalCountWrap = $("totalCountWrap");
const totalCountInput = $("totalCount");
const representativeNameInput = $("representativeName");
const signatureCanvas = $("signatureCanvas");
const signatureMessage = $("signatureMessage");
const entryMessage = $("entryMessage");
const reviewEntryButton = $("reviewEntryButton");
const rosterSection = $("rosterSection");
const rosterList = $("rosterList");
const rosterCountLabel = $("rosterCount");
const rosterSearch = $("rosterSearch");
const rosterEmpty = $("rosterEmpty");
const calculatedCountLabel = $("calculatedCount");
const countHelp = $("countHelp");
const countInput = $("totalCount");
const decreaseCountButton = $("decreaseCount");
const increaseCountButton = $("increaseCount");


let companies = [];
let selectedCompany = null;
let verifiedTicket = null;
let rosterMembers = [];
let checkedRosterIds = new Set();
let sessionGroupNumbers = new Map();
let rosterLoadFailed = false;

function getKoreaSessionLabel() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric"
  }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(now));
  const meal = hour >= 16 ? "저녁" : "점심";
  return `${date} · ${meal}`;
}

$("mealSessionLabel").textContent = getKoreaSessionLabel();

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ko-KR");
}

function companySearchText(company) {
  const aliases = Array.isArray(company.aliases) ? company.aliases : [];
  return normalize([company.name, ...aliases].join(" "));
}

function sortCompanies(list) {
  return [...list].sort((a, b) => {
    const favoriteDiff = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
    if (favoriteDiff) return favoriteDiff;

    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 9999;
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 9999;
    if (orderA !== orderB) return orderA - orderB;

    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "ko");
  });
}

function makeCompanyButton(company, { showStar = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "company-card";
  button.setAttribute("aria-label", `${company.name} 선택`);

  if (showStar && company.favorite) {
    const star = document.createElement("span");
    star.className = "company-star";
    star.setAttribute("aria-hidden", "true");
    star.textContent = "★";
    button.append(star);
  }

  const name = document.createElement("span");
  name.className = "company-name";
  name.textContent = company.name || "이름 없는 거래처";
  button.append(name);

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";
  button.append(chevron);

  button.addEventListener("click", () => chooseCompany(company));
  return button;
}

function renderCompanies() {
  const keyword = normalize(searchInput.value);
  const sorted = sortCompanies(companies);
  const filtered = keyword
    ? sorted.filter((company) => companySearchText(company).includes(keyword))
    : sorted;

  const favorites = filtered.filter((company) => company.favorite);
  const showFavorites = !keyword && favorites.length > 0;

  favoritesSection.hidden = !showFavorites;
  favoriteGrid.replaceChildren();
  companyGrid.replaceChildren();

  if (showFavorites) {
    favorites.slice(0, 6).forEach((company) => {
      favoriteGrid.append(makeCompanyButton(company, { showStar: true }));
    });
  }

  filtered.forEach((company) => {
    companyGrid.append(makeCompanyButton(company, { showStar: true }));
  });

  companyCount.textContent = `등록 거래처 ${companies.length}개`;
  resultsHeading.textContent = keyword ? "검색 결과" : "전체 거래처";
  resultsCount.textContent = `${filtered.length}개`;
  emptyState.hidden = filtered.length > 0;
  clearSearchButton.hidden = !searchInput.value;
}

function chooseCompany(company) {
  selectedCompany = company;
  selectedCompanyName.textContent = company.name;
  codeInput.value = "";
  codeMessage.hidden = true;
  codeMessage.textContent = "";
  entryPanel.hidden = true;
  codePanel.hidden = false;
  codePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => codeInput.focus({ preventScroll: true }), 180);
}

function resetCompanySelection() {
  selectedCompany = null;
  codeInput.value = "";
  codePanel.hidden = true;
  entryPanel.hidden = true;
  codeMessage.hidden = true;
  codeMessage.textContent = "";
  searchInput.focus();
}

function showLoadError(message) {
  loadState.className = "status-panel error";
  loadState.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  loadState.append(text);
  loadState.hidden = false;
  connectionState.textContent = "거래처 연결 실패";
  companyCount.textContent = "목록을 불러오지 못했습니다";
}

async function loadCompanies() {
  loadState.hidden = false;
  connectionState.textContent = "Firebase 연결 중";

  try {
    const snapshot = await getDocs(collection(db, "companies"));
    companies = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((company) => company.active !== false && typeof company.name === "string" && company.name.trim())
      .map((company) => ({
        ...company,
        name: company.name.trim(),
        aliases: Array.isArray(company.aliases) ? company.aliases : [],
        favorite: company.favorite === true
      }));

    loadState.hidden = true;
    connectionState.textContent = "Firebase 연결됨";
    renderCompanies();

    if (companies.length === 0) {
      loadState.className = "status-panel";
      loadState.textContent = "등록된 거래처가 없습니다. 관리자 화면에서 companies 컬렉션에 거래처를 등록한 후 다시 시도해 주세요.";
      loadState.hidden = false;
    }
  } catch (error) {
    console.error("거래처 목록을 불러오지 못했습니다.", error);
    const message = error?.code === "permission-denied"
      ? "Firestore 접근 권한이 없습니다. 보안 규칙과 인증 설정을 먼저 확인해야 합니다."
      : "거래처 목록을 불러오지 못했습니다. 인터넷 연결과 Firebase 설정을 확인해 주세요.";
    showLoadError(message);
  }
}

searchInput.addEventListener("input", renderCompanies);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  renderCompanies();
  searchInput.focus();
});
$("changeCompany").addEventListener("click", resetCompanySelection);

verifyCodeButton.addEventListener("click", async () => {
  codeMessage.hidden = false;
  codeMessage.className = "inline-message";
  if (!selectedCompany) { codeMessage.textContent = "거래처를 먼저 선택해 주세요."; return; }
  const code = codeInput.value.trim();
  if (!/^\d{3}$/.test(code)) { codeMessage.textContent = "장부 확인번호는 숫자 3자리로 입력해 주세요. 예: 003"; codeInput.focus(); return; }
  const ledgerNumber = String(selectedCompany.ledgerNumber ?? "");
  if (!/^\d{3}$/.test(ledgerNumber) && (!selectedCompany.accessCodeSalt || !selectedCompany.accessCodeHash)) {
    codeMessage.textContent = "이 거래처의 장부 확인번호가 아직 등록되지 않았습니다. 관리자에게 확인번호 설정을 요청해 주세요.";
    return;
  }
  verifyCodeButton.disabled = true;
  verifyCodeButton.textContent = "확인 중…";
  codeMessage.textContent = "비밀번호를 확인하고 있습니다.";
  try {
    if (/^\\d{3}$/.test(ledgerNumber)) {
      verifiedTicket = code === ledgerNumber ? "local-ok" : null;
    } else {
      // Legacy compatibility for existing four-digit hashed codes.
      const bytes = new TextEncoder().encode(selectedCompany.accessCodeSalt + ":" + code);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const actualHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      verifiedTicket = actualHash === selectedCompany.accessCodeHash ? "local-ok" : null;
    }
    codeInput.value = "";
    if (verifiedTicket) {
      codeMessage.textContent = "장부 확인번호가 확인되었습니다. 아래는 미저장 입력 화면입니다.";
      entryCompanyName.textContent = selectedCompany.name;
      configureEntryMode(selectedCompany);
      await loadRosterForCompany(selectedCompany);
      entryPanel.hidden = false;
      entryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      resizeSignatureCanvas();
    } else {
      codeMessage.textContent = "장부 확인번호가 올바르지 않습니다. 다시 확인해 주세요.";
      codeInput.focus();
    }
  } catch (error) {
    console.error("거래처 비밀번호 확인 실패:", error);
    codeMessage.textContent = "확인번호 확인에 실패했습니다. 브라우저 연결 상태를 확인해 주세요.";
  } finally {
    verifyCodeButton.disabled = false;
    verifyCodeButton.textContent = "확인번호 확인 후 계속";
  }
});

codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCodeButton.click();
});


const rosterNotice = $("rosterNotice");

function configureEntryMode(company) {
  const validModes = ["mixed", "count", "roster"];
  const configuredMode = validModes.includes(company.mealEntryMode) ? company.mealEntryMode : "mixed";
  groupNumberInput.value = String(sessionGroupNumbers.get(company.id) || 1);
  countInput.value = "0";
  const rosterMode = ["optional", "required", "none"].includes(company.rosterMode) ? company.rosterMode : "optional";
  const allowOverride = company.allowDailyModeOverride !== false;
  const allowedModes = rosterMode === "none"
    ? ["count"]
    : rosterMode === "required"
      ? ["roster", "mixed"]
      : ["count", "roster", "mixed"];

  const labels = {
    count: "총 인원 입력",
    roster: "명단 확인",
    mixed: "명단 확인 + 추가 인원"
  };
  entryMode.replaceChildren(...allowedModes.map((mode) => new Option(labels[mode], mode === "count" ? "total" : mode)));
  const preferred = rosterMode === "none"
    ? "total"
    : rosterMode === "required" && configuredMode === "count"
      ? "mixed"
      : configuredMode === "count" ? "total" : configuredMode;
  entryMode.value = [...entryMode.options].some((option) => option.value === preferred)
    ? preferred
    : entryMode.options[0]?.value || "total";
  entryMode.disabled = !allowOverride;
  entryMode.title = allowOverride ? "" : "관리자가 설정한 기본 입력 방식으로 고정되어 있습니다.";
  updateEntryModeVisibility();
}

function updateEntryModeVisibility() {
  const usesRoster = entryMode.value === "roster" || entryMode.value === "mixed";
  const countIsAdditional = entryMode.value === "mixed";
  totalCountWrap.hidden = entryMode.value === "roster";
  rosterSection.hidden = !usesRoster;
  rosterNotice.hidden = true;
  countHelp.textContent = countIsAdditional
    ? "명단 체크 인원에 더할 추가 인원을 입력하세요."
    : "총 인원을 입력하세요. + / − 버튼으로도 조절할 수 있습니다.";
  updateCalculatedCount();
}

async function loadRosterForCompany(company) {
  rosterMembers = [];
  checkedRosterIds = new Set();
  rosterLoadFailed = false;
  rosterList.replaceChildren();
  rosterSearch.value = "";
  try {
    const rosterQuery = query(collection(db, "companyRosters"), where("companyId", "==", company.id));
    const snapshot = await getDocs(rosterQuery);
    rosterMembers = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((member) => member.active !== false && typeof member.name === "string" && member.name.trim())
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "ko"));
    renderRoster();
  } catch (error) {
    console.error("사전 등록 명단을 불러오지 못했습니다.", error);
    rosterLoadFailed = true;
    rosterEmpty.hidden = false;
    rosterEmpty.querySelector("strong").textContent = "명단을 불러오지 못했습니다.";
    rosterEmpty.querySelector("p").textContent = "Firestore 읽기 권한 또는 보안 규칙을 확인해 주세요.";
    rosterCountLabel.textContent = "불러오기 실패";
  }
}

function renderRoster() {
  const keyword = normalize(rosterSearch.value);
  const visible = rosterMembers.filter((member) => normalize(member.name).includes(keyword));
  rosterList.replaceChildren();
  visible.forEach((member) => {
    const label = document.createElement("label");
    label.className = "roster-member" + (checkedRosterIds.has(member.id) ? " checked" : "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checkedRosterIds.has(member.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) checkedRosterIds.add(member.id);
      else checkedRosterIds.delete(member.id);
      label.classList.toggle("checked", checkbox.checked);
      updateCalculatedCount();
      rosterCountLabel.textContent = `${checkedRosterIds.size}/${rosterMembers.length}명 선택`;
    });
    const name = document.createElement("span");
    name.textContent = member.name;
    label.append(checkbox, name);
    rosterList.append(label);
  });
  rosterEmpty.hidden = rosterMembers.length > 0;
  if (!rosterMembers.length) {
    rosterEmpty.querySelector("strong").textContent = "등록된 명단이 없습니다.";
    rosterEmpty.querySelector("p").textContent = "관리자 화면의 거래처 명단 관리에서 이름을 먼저 등록해 주세요.";
  }
  rosterCountLabel.textContent = `${checkedRosterIds.size}/${rosterMembers.length}명 선택`;
  updateCalculatedCount();
}

function getRosterCount() { return checkedRosterIds.size; }
function getAdditionalCount() {
  const value = Number(countInput.value);
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 500) : 0;
}
function getCalculatedCount() {
  if (entryMode.value === "roster") return getRosterCount();
  if (entryMode.value === "mixed") return getRosterCount() + getAdditionalCount();
  return getAdditionalCount();
}
function updateCalculatedCount() {
  calculatedCountLabel.textContent = `${getCalculatedCount()}명`;
  decreaseCountButton.disabled = getAdditionalCount() <= 0;
  increaseCountButton.disabled = getAdditionalCount() >= 500;
}
function adjustCount(delta) {
  const next = Math.max(0, Math.min(500, getAdditionalCount() + delta));
  countInput.value = String(next);
  updateCalculatedCount();
}
decreaseCountButton.addEventListener("click", () => adjustCount(-1));
increaseCountButton.addEventListener("click", () => adjustCount(1));
countInput.addEventListener("input", () => {
  const clean = String(countInput.value).replace(/[^0-9]/g, "").slice(0, 3);
  if (countInput.value !== clean) countInput.value = clean;
  if (Number(countInput.value) > 500) countInput.value = "500";
  updateCalculatedCount();
});
rosterSearch.addEventListener("input", renderRoster);
entryMode.addEventListener("change", updateEntryModeVisibility);
$("backToCompanyButton").addEventListener("click", () => {
  entryPanel.hidden = true;
  codePanel.hidden = false;
  codePanel.scrollIntoView({ behavior: "smooth", block: "start" });
});
function resizeSignatureCanvas() {
  if (entryPanel.hidden) return;
  const rect = signatureCanvas.getBoundingClientRect();
  if (!rect.width) return;
  const old = signatureCanvas.toDataURL();
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  signatureCanvas.width = Math.round(rect.width * ratio);
  signatureCanvas.height = Math.round(rect.height * ratio);
  const ctx = signatureCanvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#173f35";
  if (old && old !== "data:,") { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height); img.src = old; }
}
let signatureDrawing = false;
let signatureHasInk = false;
function signaturePoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
signatureCanvas.addEventListener("pointerdown", (event) => {
  event.preventDefault(); signatureDrawing = true; signatureCanvas.setPointerCapture(event.pointerId);
  const p = signaturePoint(event); const ctx = signatureCanvas.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y);
});
signatureCanvas.addEventListener("pointermove", (event) => {
  if (!signatureDrawing) return;
  event.preventDefault(); const p = signaturePoint(event); const ctx = signatureCanvas.getContext("2d"); ctx.lineTo(p.x, p.y); ctx.stroke();
  signatureHasInk = true; signatureMessage.textContent = "서명이 입력되었습니다. 아직 저장되지는 않았습니다.";
});
function finishSignature() { signatureDrawing = false; }
signatureCanvas.addEventListener("pointerup", finishSignature);
signatureCanvas.addEventListener("pointercancel", finishSignature);
signatureCanvas.addEventListener("lostpointercapture", finishSignature);
$("clearSignature").addEventListener("click", () => {
  const ctx = signatureCanvas.getContext("2d"); ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureHasInk = false; signatureMessage.textContent = "서명이 지워졌습니다.";
});
reviewEntryButton.addEventListener("click", () => {
  entryMessage.hidden = false;
  const rep = representativeNameInput.value.trim();
  const count = getCalculatedCount();
  if (!verifiedTicket) { entryMessage.textContent = "거래처 확인이 필요합니다."; return; }
  if (!rep) { entryMessage.textContent = "그룹 대표자 이름을 입력해 주세요."; representativeNameInput.focus(); return; }
  if (rosterLoadFailed && entryMode.value !== "total") { entryMessage.textContent = "명단을 불러오지 못했습니다. 명단 확인 방식으로 접수할 수 없습니다."; return; }
  if (entryMode.value === "roster" && getRosterCount() < 1) { entryMessage.textContent = "방문한 명단을 한 명 이상 체크해 주세요."; return; }
  if (entryMode.value === "mixed" && count < 1) { entryMessage.textContent = "명단 체크 또는 추가 인원을 1명 이상 입력해 주세요."; return; }
  if (entryMode.value === "total" && (!Number.isInteger(Number(countInput.value)) || Number(countInput.value) < 1 || Number(countInput.value) > 500)) {
    entryMessage.textContent = "식수 인원은 1~500명 사이의 정수로 입력해 주세요."; countInput.focus(); return;
  }
  if (count < 1 || count > 500) { entryMessage.textContent = "계산된 식수는 1~500명이어야 합니다."; return; }
  if (!signatureHasInk) { entryMessage.textContent = "그룹 대표자 서명을 입력해 주세요."; return; }
  const mode = entryMode.options[entryMode.selectedIndex].text;
  const groupNo = Number(groupNumberInput.value) || 1;
  const countText = String(count) + "명";
  entryMessage.textContent = "입력 확인 완료(미저장): " + selectedCompany.name + " / 방문 그룹 " + groupNo + " / " + mode + " / " + countText + " (명단 " + getRosterCount() + "명, 추가 " + getAdditionalCount() + "명) / 대표자 " + rep + ". 실제 저장 전 확인 화면입니다.";
  sessionGroupNumbers.set(selectedCompany.id, groupNo + 1);
  groupNumberInput.value = String(groupNo + 1);
});
window.addEventListener("resize", () => { if (!entryPanel.hidden) resizeSignatureCanvas(); });

loadCompanies();
