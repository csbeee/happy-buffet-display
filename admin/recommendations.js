import { getMenuHistory } from "../firebase/firestore.js";

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const popularEl = document.getElementById("popularList");
const mainRecommendEl = document.getElementById("mainRecommendList");
const sideRecommendEl = document.getElementById("sideRecommendList");
const categoryEl = document.getElementById("categoryList");
const tabButtons = [...document.querySelectorAll("[data-meal-filter]")];

const categoryLabels = {
  main: "메인 메뉴", soup: "국 / 찌개", side: "반찬",
  kimchi: "김치", extra: "추가 반찬", dessert: "후식"
};
const MAIN_MIN_GAP_DAYS = 14;
let allHistory = [];
let activeFilter = "lunch";

function dayOf(entry) {
  if (entry.menuDate) return String(entry.menuDate).slice(0, 10);
  const stamp = entry.savedAt;
  const date = stamp && typeof stamp.toDate === "function" ? stamp.toDate() : new Date(stamp || "");
  if (Number.isNaN(date.getTime())) return "unknown-" + (entry.id || "entry");
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function addLines(target, value, category, meal) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (name) target.push({name, category, meal});
  }
}

// A history snapshot represents the selected mode at save time.
// Legacy records without explicit lunch/dinner mode are not guessed as dinner.
function dishesForEntry(entry) {
  const result = [];
  if (entry.displayMode === "special") return result;
  if (activeFilter === "lunch") {
    if (entry.displayMode !== "lunch") return result;
    for (const [key, label] of Object.entries(categoryLabels)) {
      addLines(result, entry[key], label, "점심");
    }
  } else if (activeFilter === "dinner") {
    if (entry.displayMode !== "dinner") return result;
    const dinner = entry.dinner && typeof entry.dinner === "object" ? entry.dinner : {};
    for (const [key, label] of Object.entries(categoryLabels)) {
      addLines(result, dinner[key], label, "저녁 신규");
    }
  } else if (activeFilter === "leftover") {
    if (entry.displayMode !== "dinner") return result;
    const dinner = entry.dinner && typeof entry.dinner === "object" ? entry.dinner : {};
    const leftovers = Array.isArray(dinner.leftovers) ? dinner.leftovers :
      Array.isArray(entry.dinnerLeftovers) ? entry.dinnerLeftovers : [];
    for (const item of leftovers) {
      const name = typeof item === "string" ? item : item?.name;
      if (typeof name === "string" && name.trim()) {
        result.push({name: name.trim(), category: "점심 잔여 메뉴", meal: "저녁 잔여"});
      }
    }
  }
  return result;
}

function daysBetween(older, newer) {
  if (!older || !newer || older.startsWith("unknown-") || newer.startsWith("unknown-")) return null;
  const a = Date.parse(older + "T00:00:00Z");
  const b = Date.parse(newer + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((b - a) / 86400000)) : null;
}

function showMetric(label, value, note) {
  const card = document.createElement("div");
  card.className = "metric";
  const l = document.createElement("div"); l.className = "metric-label"; l.textContent = label;
  const v = document.createElement("div"); v.className = "metric-value"; v.textContent = value;
  const n = document.createElement("div"); n.className = "metric-note"; n.textContent = note;
  card.append(l, v, n); summaryEl.appendChild(card);
}

function renderRank(container, entries, countLabel, emptyMessage = "분석할 기록이 없습니다.") {
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.textContent = emptyMessage; container.appendChild(empty); return;
  }
  const max = Math.max(1, ...entries.map(item => item.count));
  entries.forEach(item => {
    const row = document.createElement("div"); row.className = "rank-row";
    const name = document.createElement("div"); name.className = "rank-name"; name.textContent = item.name;
    const track = document.createElement("div"); track.className = "bar-track";
    const fill = document.createElement("div"); fill.className = "bar-fill";
    fill.style.width = Math.max(3, item.count / max * 100) + "%";
    track.appendChild(fill);
    const count = document.createElement("div"); count.className = "rank-count"; count.textContent = countLabel(item);
    row.append(name, track, count); container.appendChild(row);
  });
}

function renderRecommendationCards(container, items, emptyMessage) {
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.textContent = emptyMessage; container.appendChild(empty); return;
  }
  items.forEach(item => {
    const card = document.createElement("article"); card.className = "recommend-card";
    const title = document.createElement("h3"); title.textContent = item.name;
    const meta = document.createElement("div"); meta.className = "recommend-meta";
    const gapText = item.daysSinceLast === null ? "간격 확인 불가" : "마지막 제공 후 " + item.daysSinceLast + "일";
    meta.textContent = item.category + " · 기록상 제공 " + item.count + "일 · 마지막 기록 " +
      (item.lastDate || "날짜 없음") + " · " + gapText;
    const button = document.createElement("button"); button.type = "button"; button.textContent = "메뉴명 복사";
    button.addEventListener("click", () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(item.name)
          .then(() => alert("메뉴명을 복사했습니다. 관리자 화면에서 원하는 칸에 붙여 넣으세요."))
          .catch(() => window.prompt("메뉴명을 복사하세요:", item.name));
      } else window.prompt("메뉴명을 복사하세요:", item.name);
    });
    card.append(title, meta, button); container.appendChild(card);
  });
}

function renderSelectedStats() {
  const valid = allHistory.filter(entry => entry && typeof entry === "object");
  const days = new Set(valid.map(dayOf).filter(day => !day.startsWith("unknown-")));
  const specialDays = new Set(valid.filter(entry => entry.displayMode === "special").map(dayOf).filter(day => !day.startsWith("unknown-")));
  const dishes = new Map();
  const categories = new Map();
  const dayDishSeen = new Set();
  const dayCategorySeen = new Set();
  const selectedDays = new Set();

  for (const entry of valid) {
    const day = dayOf(entry);
    if (day.startsWith("unknown-")) continue;
    for (const dish of dishesForEntry(entry)) {
      selectedDays.add(day);
      const normalizedName = dish.name.toLocaleLowerCase("ko");
      const dishKey = dish.meal + "|" + dish.category + "|" + normalizedName;
      const dedupeDishKey = day + "|" + dishKey;
      if (!dayDishSeen.has(dedupeDishKey)) {
        dayDishSeen.add(dedupeDishKey);
        const item = dishes.get(dishKey) || {name:dish.name, category:dish.category, meal:dish.meal, count:0, lastDate:""};
        item.count += 1;
        if (!item.lastDate || day > item.lastDate) item.lastDate = day;
        dishes.set(dishKey, item);
      }
      const categoryKey = day + "|" + dish.meal + "|" + dish.category;
      if (!dayCategorySeen.has(categoryKey)) {
        dayCategorySeen.add(categoryKey);
        const mapKey = dish.meal + "|" + dish.category;
        categories.set(mapKey, {name:dish.category, count:(categories.get(mapKey)?.count || 0) + 1});
      }
    }
  }

  const latestDay = new Intl.DateTimeFormat("sv-SE", {
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
  }).format(new Date());
  const dishList = [...dishes.values()].map(item => ({...item, daysSinceLast:daysBetween(item.lastDate, latestDay)}));
  const sortedPopular = [...dishList].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name,"ko"));
  const mainRecommendations = activeFilter === "leftover" ? [] : dishList
    .filter(item => item.category === "메인 메뉴" && item.daysSinceLast !== null &&
      (activeFilter === "lunch" ? item.meal === "점심" : item.meal === "저녁 신규") &&
      item.daysSinceLast >= MAIN_MIN_GAP_DAYS)
    .sort((a,b) => b.daysSinceLast-a.daysSinceLast || a.count-b.count || a.name.localeCompare(b.name,"ko"))
    .slice(0,12);
  const sideRecommendations = dishList
    .filter(item => activeFilter === "leftover"
      ? item.category === "점심 잔여 메뉴" && item.daysSinceLast !== null
      : ["반찬","추가 반찬","김치","국 / 찌개","후식"].includes(item.category) && item.daysSinceLast !== null)
    .sort((a,b) => b.daysSinceLast-a.daysSinceLast || a.count-b.count || a.name.localeCompare(b.name,"ko"))
    .slice(0,12);

  summaryEl.replaceChildren();
  const filterLabel = activeFilter === "lunch" ? "점심" : activeFilter === "dinner" ? "저녁 신규 메뉴" : "점심 잔여 메뉴";
  showMetric("분석 유형", filterLabel, "선택한 제공 유형만 집계");
  showMetric("기록된 날짜", String(selectedDays.size), "중복 날짜 제외");
  showMetric("서로 다른 메뉴", String(dishList.length), "메뉴·제공 유형별 분리");
  showMetric("가장 많이 나온 메뉴", sortedPopular[0]?.name || "-", sortedPopular[0] ? sortedPopular[0].count + "일 기록" : "해당 유형 기록 없음");

  renderRank(popularEl, sortedPopular.slice(0,10), item => item.count + "일",
    activeFilter === "dinner" ? "저녁 모드로 저장한 메뉴 이력이 없습니다. 관리자에서 저녁 메뉴를 선택해 저장하면 집계됩니다." :
    activeFilter === "leftover" ? "저녁 잔여 메뉴로 기록된 이력이 없습니다." : "점심 메뉴 이력이 없습니다.");
  renderRecommendationCards(mainRecommendEl, mainRecommendations,
    activeFilter === "leftover" ? "잔여 메뉴 통계에서는 메인 메뉴 추천을 표시하지 않습니다." :
    "최근 기록 기준으로 제공 간격이 " + MAIN_MIN_GAP_DAYS + "일 이상 지난 메인 메뉴가 없습니다.");
  renderRecommendationCards(sideRecommendEl, sideRecommendations,
    activeFilter === "leftover" ? "기록상 다시 제공할 수 있는 점심 잔여 메뉴가 없습니다." : "반찬·국·김치·후식 이력이 아직 없습니다.");
  renderRank(categoryEl, [...categories.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name,"ko")),
    item => item.count + "일", "카테고리별 통계가 없습니다.");

  const modeText = activeFilter === "lunch" ? "점심" : activeFilter === "dinner" ? "저녁 신규 메뉴" : "점심 잔여 메뉴";
  statusEl.textContent = "통계 계산 완료 · " + valid.length + "건 분석 · " + modeText +
    " · 동일 날짜 메뉴 중복 제거 · 메인 메뉴 재추천 간격 " + MAIN_MIN_GAP_DAYS + "일";
  const specialNote = document.getElementById("specialStatsNote");
  if (specialNote) specialNote.textContent = "스페셜데이 기록 " + specialDays.size +
    "일은 점심·저녁 일반 메뉴 통계에서 제외됩니다. 전체 기록 날짜 " + days.size + "일.";
}

async function load() {
  statusEl.textContent = "최근 메뉴 이력을 불러와 통계를 계산하고 있습니다.";
  try {
    allHistory = await getMenuHistory(200);
    renderSelectedStats();
  } catch (error) {
    console.error("메뉴 추천/통계 조회 실패:", error);
    statusEl.textContent = "통계를 불러오지 못했습니다. Firestore 보안 규칙과 menuHistory 컬렉션 읽기 권한을 확인해 주세요.";
    summaryEl.replaceChildren();
    [popularEl, mainRecommendEl, sideRecommendEl, categoryEl].forEach(el => el.replaceChildren());
  }
}

tabButtons.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.mealFilter;
  tabButtons.forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });
  renderSelectedStats();
}));
document.getElementById("refreshBtn").addEventListener("click", load);
load();
