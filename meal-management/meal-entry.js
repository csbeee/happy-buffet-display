import { db } from "../firebase/firebase-config.js";
import {
  collection,
  getDocs
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
const totalCountWrap = $("totalCountWrap");
const totalCountInput = $("totalCount");
const representativeNameInput = $("representativeName");
const signatureCanvas = $("signatureCanvas");
const signatureMessage = $("signatureMessage");
const entryMessage = $("entryMessage");
const reviewEntryButton = $("reviewEntryButton");


let companies = [];
let selectedCompany = null;
let verifiedTicket = null;

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

async function hashCompanyCode(salt, code) {
  const bytes = new TextEncoder().encode(salt + ":" + code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

verifyCodeButton.addEventListener("click", async () => {
  codeMessage.hidden = false;
  codeMessage.className = "inline-message";
  if (!selectedCompany) { codeMessage.textContent = "거래처를 먼저 선택해 주세요."; return; }
  const code = codeInput.value.trim();
  if (!/^\\d{4}$/.test(code)) { codeMessage.textContent = "비밀번호는 숫자 4자리로 입력해 주세요."; codeInput.focus(); return; }
  if (!selectedCompany.accessCodeSalt || !selectedCompany.accessCodeHash) {
    codeMessage.textContent = "이 거래처의 비밀번호가 아직 등록되지 않았습니다. 관리자에게 비밀번호 설정을 요청해 주세요.";
    return;
  }
  verifyCodeButton.disabled = true;
  verifyCodeButton.textContent = "확인 중…";
  codeMessage.textContent = "비밀번호를 확인하고 있습니다.";
  try {
    const actualHash = await hashCompanyCode(selectedCompany.accessCodeSalt, code);
    verifiedTicket = actualHash === selectedCompany.accessCodeHash ? "local-ok" : null;
    codeInput.value = "";
    if (verifiedTicket) {
      codeMessage.textContent = "비밀번호가 확인되었습니다. 아래는 미저장 입력 화면입니다.";
      entryCompanyName.textContent = selectedCompany.name;
      entryPanel.hidden = false;
      entryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      resizeSignatureCanvas();
    } else {
      codeMessage.textContent = "비밀번호가 올바르지 않습니다. 다시 확인해 주세요.";
      codeInput.focus();
    }
  } catch (error) {
    console.error("거래처 비밀번호 확인 실패:", error);
    codeMessage.textContent = "비밀번호 확인에 실패했습니다. 브라우저 연결 상태를 확인해 주세요.";
  } finally {
    verifyCodeButton.disabled = false;
    verifyCodeButton.textContent = "비밀번호 확인 후 계속";
  }
});

codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCodeButton.click();
});


const rosterNotice = $("rosterNotice");
entryMode.addEventListener("change", () => {
  totalCountWrap.hidden = entryMode.value === "roster";
  rosterNotice.hidden = entryMode.value === "total";
});
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
  const count = Number(totalCountInput.value);
  if (!verifiedTicket) { entryMessage.textContent = "거래처 확인이 필요합니다."; return; }
  if (!rep) { entryMessage.textContent = "그룹 대표자 이름을 입력해 주세요."; representativeNameInput.focus(); return; }
  if (entryMode.value !== "roster" && (!Number.isInteger(count) || count < 1 || count > 500)) {
    entryMessage.textContent = "식수 인원은 1~500명 사이의 정수로 입력해 주세요."; totalCountInput.focus(); return;
  }
  if (!signatureHasInk) { entryMessage.textContent = "그룹 대표자 서명을 입력해 주세요."; return; }
  const mode = entryMode.options[entryMode.selectedIndex].text;
  const group = $("groupLabel").value.trim() || "방문 그룹";
  const countText = entryMode.value === "roster" ? "명단 확인 기능 연결 전" : String(count) + "명";
  entryMessage.textContent = "입력 확인 완료(미저장): " + selectedCompany.name + " / " + group + " / " + mode + " / " + countText + " / 대표자 " + rep + ". 실제 접수 저장과 중복 방지는 다음 단계에서 연결합니다.";
});
window.addEventListener("resize", () => { if (!entryPanel.hidden) resizeSignatureCanvas(); });

loadCompanies();
