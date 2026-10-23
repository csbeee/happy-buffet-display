import { getMenuHistory } from "../firebase/firestore.js";

const listEl = document.getElementById("historyList");
const statusEl = document.getElementById("status");
const dateFilter = document.getElementById("dateFilter");
const moreBtn = document.getElementById("moreBtn");

let allHistory = [];
let visibleCount = 30;

const categoryLabels = {
  main: "메인 메뉴",
  soup: "국 / 찌개",
  side: "반찬",
  kimchi: "김치",
  extra: "추가 반찬",
  dessert: "후식",
  notice: "안내 문구"
};

function dateString(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value.toDate === "function") {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(value.toDate());
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function timeString(value) {
  if (!value) return "저장 시간 정보 없음";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "저장 시간 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
}

function toText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return "";
  return String(value);
}

function appendGroup(container, title, value) {
  const text = toText(value);
  if (!text) return;
  const group = document.createElement("section");
  group.className = "menu-group";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  group.append(heading, paragraph);
  container.appendChild(group);
}

function makeCard(entry) {
  const card = document.createElement("article");
  card.className = "history-card";

  const top = document.createElement("div");
  top.className = "card-top";
  const left = document.createElement("div");
  const date = document.createElement("div");
  date.className = "card-date";
  date.textContent = entry.menuDate || dateString(entry.savedAt) || "날짜 정보 없음";
  const mode = document.createElement("span");
  const isSpecial = entry.displayMode === "special";
  mode.className = "mode-tag" + (isSpecial ? " special" : "");
  mode.textContent = isSpecial ? "특별 컨셉데이" : "일반 메뉴";
  date.appendChild(mode);
  const saved = document.createElement("div");
  saved.className = "card-meta";
  saved.textContent = timeString(entry.savedAt);
  left.append(date, saved);
  top.appendChild(left);
  card.appendChild(top);

  const groups = document.createElement("div");
  groups.className = "menu-groups";

  if (isSpecial) {
    const concept = entry.concept || {};
    appendGroup(groups, "컨셉", concept.theme || "직접 설정");
    appendGroup(groups, "소개 문구", concept.subtitle);
    if (Array.isArray(entry.sections)) {
      entry.sections.forEach(section => {
        appendGroup(groups, section.title || "특별 메뉴", section.items);
      });
    }
  } else {
    const used = new Set(["displayMode", "concept", "sections", "updatedAt", "savedAt", "menuDate", "source"]);
    for (const [key, label] of Object.entries(categoryLabels)) {
      if (Object.prototype.hasOwnProperty.call(entry, key)) {
        appendGroup(groups, label, entry[key]);
        used.add(key);
      }
    }
    // 기존 메뉴 구조에 추가 필드가 있더라도 화면을 깨뜨리지 않도록 표시합니다.
    for (const [key, value] of Object.entries(entry)) {
      if (!used.has(key) && Array.isArray(value) && value.length) {
        appendGroup(groups, key, value);
      }
    }
  }

  if (!groups.childElementCount) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "이 기록에 표시할 메뉴 내용이 없습니다.";
    card.appendChild(empty);
  } else {
    card.appendChild(groups);
  }

  return card;
}

function render() {
  const selectedDate = dateFilter.value;
  const filtered = allHistory.filter(entry => !selectedDate || (entry.menuDate || dateString(entry.savedAt)) === selectedDate);
  const shown = filtered.slice(0, visibleCount);
  listEl.replaceChildren();

  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = selectedDate
      ? "선택한 날짜의 저장 이력이 없습니다."
      : "저장 이력이 없습니다. 관리자 화면에서 메뉴를 저장하면 이곳에 기록됩니다.";
    listEl.appendChild(empty);
  } else {
    shown.forEach(entry => listEl.appendChild(makeCard(entry)));
  }

  statusEl.textContent = selectedDate
    ? `${selectedDate} · ${filtered.length}건`
    : `전체 ${filtered.length}건 · 최근 저장 순`;
  moreBtn.hidden = filtered.length <= visibleCount;
}

async function loadHistory() {
  statusEl.textContent = "이력을 불러오는 중입니다.";
  moreBtn.hidden = true;
  try {
    allHistory = await getMenuHistory(200);
    visibleCount = 30;
    render();
  } catch (error) {
    console.error("메뉴 이력 조회 실패:", error);
    statusEl.textContent = "이력을 불러오지 못했습니다. Firestore 보안 규칙과 menuHistory 컬렉션 권한을 확인해 주세요.";
    listEl.replaceChildren();
  }
}

document.getElementById("filterBtn").addEventListener("click", () => {
  visibleCount = 30;
  render();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  dateFilter.value = "";
  visibleCount = 30;
  render();
});
document.getElementById("refreshBtn").addEventListener("click", loadHistory);
moreBtn.addEventListener("click", () => {
  visibleCount += 30;
  render();
});

loadHistory();