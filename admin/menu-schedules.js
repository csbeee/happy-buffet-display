import { auth } from "../firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getMenuSchedule,
  saveMenuSchedule
} from "../firebase/firestore.js";

const ADMIN_EMAIL = "seob1984@gmail.com";
const $ = id => document.getElementById(id);
const dates = [];
let recordByDate = new Map();
let currentRecord = null;

function setStatus(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function items(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()) : [];
}

function lines(value) {
  return String(value || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function setLines(id, value) {
  $(id).value = items(value).join("\n");
}

function populateDateSelect() {
  const select = $("dateSelect");
  select.replaceChildren();
  dates.forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    select.appendChild(option);
  });
  if (dates.length) select.value = dates[0];
}

function fillEditor(record) {
  currentRecord = record;
  const lunch = record.lunch || {};
  const dinner = record.dinner || {};
  setLines("lunchMain", lunch.main);
  setLines("lunchSide", [...items(lunch.side), ...items(lunch.service)]);
  setLines("lunchSoup", lunch.soup);
  setLines("lunchDessert", lunch.dessert);
  setLines("lunchNotice", lunch.notice);
  setLines("dinnerMain", dinner.main);
  setLines("dinnerSide", [...items(dinner.side), ...items(dinner.service)]);
  setLines("dinnerSoup", dinner.soup);
  setLines("dinnerDessert", dinner.dessert);
  setLines("dinnerNotice", dinner.notice);
  setStatus("editStatus", `${record.date} 메뉴를 불러왔습니다.`);
}

async function loadSelectedDate() {
  const date = $("dateSelect").value;
  if (!date) return;
  setStatus("editStatus", "저장된 메뉴를 확인하는 중입니다.");
  try {
    const saved = await getMenuSchedule(date);
    fillEditor(saved || recordByDate.get(date) || { date, lunch: {}, dinner: {} });
  } catch (error) {
    console.error("날짜별 메뉴 조회 실패:", error);
    fillEditor(recordByDate.get(date) || { date, lunch: {}, dinner: {} });
    setStatus("editStatus", "Firestore 조회에 실패해 변환 원본을 표시합니다. 권한을 확인해 주세요.", true);
  }
}

function buildMeal(prefix, original = {}) {
  const main = lines($(prefix + "Main").value);
  const side = lines($(prefix + "Side").value);
  const soup = lines($(prefix + "Soup").value);
  const dessert = lines($(prefix + "Dessert").value);
  const notice = lines($(prefix + "Notice").value);
  const closed = notice.some(value => /휴무|대체휴일|대체 휴일|어린이날|노동절|한글날|개천절/.test(value));
  return {
    ...original,
    main,
    side,
    soup,
    dessert,
    service: [],
    notice,
    status: closed ? "closed" : (main.length || side.length || soup.length || dessert.length ? "open" : (notice.length ? "notice" : "not-listed"))
  };
}

async function saveSelectedDate() {
  const date = $("dateSelect").value;
  if (!date) return;
  const updated = {
    ...(currentRecord || {}),
    date,
    lunch: buildMeal("lunch", currentRecord?.lunch || {}),
    dinner: buildMeal("dinner", currentRecord?.dinner || {}),
    meta: {
      ...(currentRecord?.meta || {}),
      manuallyEdited: true
    }
  };

  $("saveDateBtn").disabled = true;
  setStatus("editStatus", "저장 중입니다.");
  try {
    await saveMenuSchedule(updated);
    currentRecord = updated;
    recordByDate.set(date, updated);
    setStatus("editStatus", `${date} 메뉴를 저장했습니다. 전광판은 오늘 날짜 메뉴를 자동으로 불러옵니다.`);
  } catch (error) {
    console.error("날짜별 메뉴 저장 실패:", error);
    setStatus("editStatus", error.message || "저장하지 못했습니다.", true);
  } finally {
    $("saveDateBtn").disabled = false;
  }
}

$("loadDateBtn").addEventListener("click", loadSelectedDate);
$("saveDateBtn").addEventListener("click", saveSelectedDate);

let initialized = false;
onAuthStateChanged(auth, user => {
  if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL || initialized) return;
  initialized = true;
  const start = new Date(2026, 3, 1);
  const end = new Date(2026, 10, 30);
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  populateDateSelect();
  $("editPanel").hidden = false;
  loadSelectedDate();
});
