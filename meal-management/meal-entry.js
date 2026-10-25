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

let companies = [];
let selectedCompany = null;

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
  codePanel.hidden = false;
  codePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => codeInput.focus({ preventScroll: true }), 180);
}

function resetCompanySelection() {
  selectedCompany = null;
  codeInput.value = "";
  codePanel.hidden = true;
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

verifyCodeButton.addEventListener("click", () => {
  codeMessage.textContent = "현재는 화면 시안 단계입니다. 실제 접수 전에 서버 측 확인 코드 검증(Cloud Functions)과 Firebase 보안 규칙을 연결해야 합니다. 아직 코드를 검증하거나 식수를 저장하지 않았습니다.";
  codeMessage.hidden = false;
});

codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCodeButton.click();
});

loadCompanies();
