import { getMenuHistory } from "../firebase/firestore.js";

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const popularEl = document.getElementById("popularList");
const mainRecommendEl = document.getElementById("mainRecommendList");
const sideRecommendEl = document.getElementById("sideRecommendList");
const categoryEl = document.getElementById("categoryList");

const categoryLabels = {
  main: "메인 메뉴", soup: "국 / 찌개", side: "반찬",
  kimchi: "김치", extra: "추가 반찬", dessert: "후식"
};
const MAIN_MIN_GAP_DAYS = 14;

function dayOf(entry) {
  if (entry.menuDate) return String(entry.menuDate).slice(0, 10);
  const stamp = entry.savedAt;
  const date = stamp && typeof stamp.toDate === "function" ? stamp.toDate() : new Date(stamp || "");
  if (Number.isNaN(date.getTime())) return "unknown-" + (entry.id || "entry");
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function allDishes(entry) {
  const dishes = [];
  const add = (name, category, meal = "점심") => {
    if (typeof name !== "string") return;
    const clean = name.trim();
    if (clean) dishes.push({name:clean,category,meal});
  };
  if (entry.displayMode === "special" && Array.isArray(entry.sections)) {
    for (const section of entry.sections) if (Array.isArray(section.items)) section.items.forEach(name => add(name,section.title || "특별 메뉴","특별일"));
    return dishes;
  }
  for (const [key,label] of Object.entries(categoryLabels)) {
    const items = entry[key];
    if (Array.isArray(items)) items.forEach(name => add(name,label,"점심"));
    else if (typeof items === "string") add(items,label,"점심");
  }
  const dinner = entry.dinner && typeof entry.dinner === "object" ? entry.dinner : {};
  for (const [key,label] of Object.entries(categoryLabels)) {
    const items = dinner[key];
    if (Array.isArray(items)) items.forEach(name => add(name,label,"저녁 별도"));
    else if (typeof items === "string") add(items,label,"저녁 별도");
  }
  const leftovers = Array.isArray(dinner.leftovers) ? dinner.leftovers : (Array.isArray(entry.dinnerLeftovers) ? entry.dinnerLeftovers : []);
  leftovers.forEach(item => typeof item === "string" ? add(item,"점심 잔여 메뉴","저녁 잔여") : item && add(item.name,"점심 잔여 메뉴","저녁 잔여"));
  return dishes;
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
  entries.forEach(item => {
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
    count.textContent = countLabel(item);
    row.append(name, track, count);
    container.appendChild(row);
  });
}

function renderRecommendationCards(container, items, emptyMessage) {
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "recommend-card";
    const title = document.createElement("h3");
    title.textContent = item.name;
    const meta = document.createElement("div");
    meta.className = "recommend-meta";
    const gapText = item.daysSinceLast === null ? "간격 확인 불가" : "마지막 제공 후 " + item.daysSinceLast + "일";
    meta.textContent = item.meal + " · " + item.category + " · 기록상 제공 " + item.count + "일 · 마지막 기록 " +
      (item.lastDate || "날짜 없음") + " · " + gapText;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "메뉴명 복사";
    button.addEventListener("click", () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(item.name)
          .then(() => alert("메뉴명을 복사했습니다. 관리자 화면에서 원하는 칸에 붙여 넣으세요."))
          .catch(() => window.prompt("메뉴명을 복사하세요:", item.name));
      } else {
        window.prompt("메뉴명을 복사하세요:", item.name);
      }
    });
    card.append(title, meta, button);
    container.appendChild(card);
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

    for (const entry of valid) {
      const day = dayOf(entry);
      if (day.startsWith("unknown-")) continue;
      for (const dish of allDishes(entry)) {
        const normalizedName = dish.name.toLocaleLowerCase("ko");
        const dishKey = dish.meal + "|" + dish.category + "|" + normalizedName;
        const dedupeDishKey = day + "|" + dishKey;
        if (!dayDishSeen.has(dedupeDishKey)) {
          dayDishSeen.add(dedupeDishKey);
          const item = dishes.get(dishKey) || {
            name: dish.name, category: dish.category, meal: dish.meal, count: 0, lastDate: ""
          };
          item.count += 1;
          if (!item.lastDate || day > item.lastDate) item.lastDate = day;
          dishes.set(dishKey, item);
        }
        const categoryKey = day + "|" + dish.category;
        if (!dayCategorySeen.has(categoryKey)) {
          dayCategorySeen.add(categoryKey);
          categories.set(dish.category, (categories.get(dish.category) || 0) + 1);
        }
      }
    }

    const latestDay = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    const dishList = [...dishes.values()].map(item => ({
      ...item, daysSinceLast: daysBetween(item.lastDate, latestDay)
    }));
    const sortedPopular = [...dishList].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));

    const mainRecommendations = dishList
      .filter(item => item.category === "메인 메뉴" && ["점심", "저녁 별도"].includes(item.meal) && item.daysSinceLast !== null && item.daysSinceLast >= MAIN_MIN_GAP_DAYS)
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast || a.count - b.count || a.name.localeCompare(b.name, "ko"))
      .slice(0, 12);
    const sideRecommendations = dishList
      .filter(item => ["반찬", "추가 반찬", "점심 잔여 메뉴"].includes(item.category) && item.daysSinceLast !== null)
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast || a.count - b.count || a.name.localeCompare(b.name, "ko"))
      .slice(0, 12);

    summaryEl.replaceChildren();
    showMetric("분석한 저장 기록", String(valid.length), "최근 최대 200건");
    showMetric("기록된 날짜", String(days.size), "중복 날짜 제외");
    showMetric("서로 다른 메뉴", String(new Set(dishList.map(item => item.name.toLocaleLowerCase("ko"))).size), "점심·저녁 제공 유형 분리");
    showMetric("가장 많이 나온 메뉴", sortedPopular[0]?.name || "-", sortedPopular[0] ? sortedPopular[0].count + "일 기록" : "이력 없음");

    renderRank(popularEl, sortedPopular.slice(0, 10), item => item.count + "일 · " + item.meal);
    renderRecommendationCards(
      mainRecommendEl,
      mainRecommendations,
      "최근 기록 기준으로 제공 간격이 " + MAIN_MIN_GAP_DAYS + "일 이상 지난 메인 메뉴가 없습니다."
    );
    renderRecommendationCards(
      sideRecommendEl,
      sideRecommendations,
      "반찬 이력이 아직 없습니다. 메뉴 저장 기록이 쌓이면 별도로 추천됩니다."
    );
    const categoryEntries = [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
    renderRank(categoryEl, categoryEntries, item => item.count + "일");

    statusEl.textContent = valid.length
      ? "통계 계산 완료 · " + valid.length + "건 분석 · 점심/저녁 별도/점심 잔여 구분 · 메인 간격 기준 " + MAIN_MIN_GAP_DAYS + "일"
      : "아직 저장된 메뉴 이력이 없습니다.";
  } catch (error) {
    console.error("메뉴 추천/통계 조회 실패:", error);
    statusEl.textContent = "통계를 불러오지 못했습니다. Firestore 보안 규칙과 menuHistory 컬렉션 읽기 권한을 확인해 주세요.";
    summaryEl.replaceChildren();
    [popularEl, mainRecommendEl, sideRecommendEl, categoryEl].forEach(el => el.replaceChildren());
  }
}

document.getElementById("refreshBtn").addEventListener("click", load);
load();
