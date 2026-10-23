import { getMenuHistory } from "../firebase/firestore.js";

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const popularEl = document.getElementById("popularList");
const recommendEl = document.getElementById("recommendList");
const categoryEl = document.getElementById("categoryList");

const categoryLabels = {
  main: "메인 메뉴",
  soup: "국 / 찌개",
  side: "반찬",
  kimchi: "김치",
  extra: "추가 반찬",
  dessert: "후식"
};

function dayOf(entry) {
  if (entry.menuDate) return String(entry.menuDate).slice(0, 10);
  const stamp = entry.savedAt;
  const date = stamp && typeof stamp.toDate === "function" ? stamp.toDate() : new Date(stamp || "");
  if (Number.isNaN(date.getTime())) return "unknown-" + (entry.id || Math.random());
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function savedDate(entry) {
  const date = dayOf(entry);
  return date.startsWith("unknown-") ? "" : date;
}

function allDishes(entry) {
  const dishes = [];
  const add = (name, category) => {
    if (typeof name !== "string") return;
    const clean = name.trim();
    if (clean) dishes.push({ name: clean, category });
  };

  if (entry.displayMode === "special" && Array.isArray(entry.sections)) {
    for (const section of entry.sections) {
      const title = section.title || "특별 메뉴";
      if (Array.isArray(section.items)) section.items.forEach(name => add(name, title));
    }
    return dishes;
  }

  for (const [key, label] of Object.entries(categoryLabels)) {
    const items = entry[key];
    if (Array.isArray(items)) items.forEach(name => add(name, label));
    else if (typeof items === "string") add(items, label);
  }
  return dishes;
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showMetric(label, value, note) {
  const card = document.createElement("div");
  card.className = "metric";
  const l = document.createElement("div");
  l.className = "metric-label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "metric-value";
  v.textContent = value;
  const n = document.createElement("div");
  n.className = "metric-note";
  n.textContent = note;
  card.append(l, v, n);
  summaryEl.appendChild(card);
}

function renderRank(container, entries, countLabel) {
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "분석할 메뉴 이력이 아직 없습니다. 관리자 화면에서 메뉴를 저장하면 통계가 쌓입니다.";
    container.appendChild(empty);
    return;
  }
  const max = Math.max(1, ...entries.map(item => item.count));
  entries.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "rank-row";
    const name = document.createElement("div");
    name.className = "rank-name";
    name.textContent = item.name;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = Math.max(3, item.count / max * 100) + "%";
    track.appendChild(fill);
    const count = document.createElement("div");
    count.className = "rank-count";
    count.textContent = countLabel(item, index);
    row.append(name, track, count);
    container.appendChild(row);
  });
}

function renderRecommendationCards(items) {
  recommendEl.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "추천할 과거 메뉴가 없습니다. 메뉴 저장 이력이 쌓이면 추천이 표시됩니다.";
    recommendEl.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "recommend-card";
    const title = document.createElement("h3");
    title.textContent = item.name;
    const meta = document.createElement("div");
    meta.className = "recommend-meta";
    meta.textContent = `${item.category} · 기록상 제공 ${item.count}일 · 마지막 기록 ${item.lastDate || "날짜 없음"}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "관리자에서 메뉴 준비";
    button.addEventListener("click", () => {
      // 단일 메뉴만 자동 삽입하면 전체 메뉴 구조가 바뀌므로 안전하게 메뉴명을 복사합니다.
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(item.name)
          .then(() => alert("메뉴명을 복사했습니다. 관리자 화면에서 원하는 칸에 붙여 넣으세요."))
          .catch(() => window.prompt("메뉴명을 복사하세요:", item.name));
      } else {
        window.prompt("메뉴명을 복사하세요:", item.name);
      }
    });
    card.append(title, meta, button);
    recommendEl.appendChild(card);
  });
}

async function load() {
  statusEl.textContent = "최근 메뉴 이력을 불러와 통계를 계산하고 있습니다.";
  try {
    const history = await getMenuHistory(200);
    const valid = history.filter(entry => entry && typeof entry === "object");
    const days = new Set(valid.map(dayOf).filter(day => !day.startsWith("unknown-")));
    const dishes = new Map();
    const categories = new Map();
    const dayDishSeen = new Set();
    const dayCategorySeen = new Set();

    // 저장 횟수 대신 '메뉴가 기록된 날짜 수'를 계산해 같은 날 여러 번 저장한 중복을 줄입니다.
    for (const entry of valid) {
      const day = dayOf(entry);
      if (day.startsWith("unknown-")) continue;
      for (const dish of allDishes(entry)) {
        const dishKey = dish.name.toLocaleLowerCase("ko");
        const dedupeDishKey = day + "|" + dishKey;
        if (!dayDishSeen.has(dedupeDishKey)) {
          dayDishSeen.add(dedupeDishKey);
          const item = dishes.get(dishKey) || {
            name: dish.name, category: dish.category, count: 0, lastDate: ""
          };
          item.count += 1;
          if (!item.lastDate || day > item.lastDate) item.lastDate = day;
          if (day > (item._firstDate || "")) item._firstDate = day;
          dishes.set(dishKey, item);
        }
        const categoryKey = day + "|" + dish.category;
        if (!dayCategorySeen.has(categoryKey)) {
          dayCategorySeen.add(categoryKey);
          categories.set(dish.category, (categories.get(dish.category) || 0) + 1);
        }
      }
    }

    const dishList = [...dishes.values()];
    const sortedPopular = [...dishList].sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
    const latestDay = [...days].sort().at(-1) || "";
    const recommendations = [...dishList]
      .sort((a,b) => {
        const aOld = a.lastDate === latestDay ? 1 : 0;
        const bOld = b.lastDate === latestDay ? 1 : 0;
        return aOld - bOld || a.count - b.count || a.lastDate.localeCompare(b.lastDate) || a.name.localeCompare(b.name, "ko");
      })
      .slice(0, 12);

    summaryEl.replaceChildren();
    showMetric("분석한 저장 기록", String(valid.length), "최근 최대 200건");
    showMetric("기록된 날짜", String(days.size), "중복 날짜 제외");
    showMetric("서로 다른 메뉴", String(dishList.length), "메뉴명 기준");
    showMetric("가장 많이 나온 메뉴", sortedPopular[0]?.name || "-", sortedPopular[0] ? `${sortedPopular[0].count}일 기록` : "이력 없음");

    renderRank(popularEl, sortedPopular.slice(0, 10), item => `${item.count}일`);
    renderRecommendationCards(recommendations);
    const categoryEntries = [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
    renderRank(categoryEl, categoryEntries, item => `${item.count}일`);

    statusEl.textContent = valid.length
      ? `통계 계산 완료 · ${valid.length}건 분석 · ${dishList.length}개 메뉴`
      : "아직 저장된 메뉴 이력이 없습니다.";
  } catch (error) {
    console.error("메뉴 추천/통계 조회 실패:", error);
    statusEl.textContent = "통계를 불러오지 못했습니다. Firestore 보안 규칙과 menuHistory 컬렉션 읽기 권한을 확인해 주세요.";
    summaryEl.replaceChildren();
    [popularEl, recommendEl, categoryEl].forEach(el => el.replaceChildren());
  }
}

document.getElementById("refreshBtn").addEventListener("click", load);
load();