import { auth } from "../firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getMenuSchedule,
  importMenuSchedules,
  saveMenuSchedule
} from "../firebase/firestore.js";

const ADMIN_EMAIL = "seob1984@gmail.com";
const $ = id => document.getElementById(id);
let records = [];
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

function renderPreview() {
  const summary = $("datasetSummary");
  const tbody = $("previewTable").querySelector("tbody");
  tbody.replaceChildren();

  const lunchOpen = records.filter(record => record.lunch?.status === "open").length;
  const dinnerOpen = records.filter(record => record.dinner?.status === "open").length;
  const conflicts = records.filter(record => record.meta?.sourceConflict);
  summary.replaceChildren();

  [
    `총 ${records.length}일`,
    `${records[0]?.date || "-"} ~ ${records.at(-1)?.date || "-"}`,
    `중식 메뉴 ${lunchOpen}일`,
    `석식 메뉴 ${dinnerOpen}일`,
    `원본 대조 필요 ${conflicts.length}건`
  ].forEach(label => {
    const chip = document.createElement("span");
    chip.className = "summary-chip";
    chip.textContent = label;
    summary.appendChild(chip);
  });
  summary.hidden = false;

  records.slice(0, 12).forEach(record => {
    const tr = document.createElement("tr");
    const values = [
      record.date,
      items(record.lunch?.main).join(", "),
      items(record.lunch?.soup).join(", "),
      items(record.dinner?.main).join(", "),
      items(record.dinner?.soup).join(", ")
    ];
    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value || "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  if (conflicts.length) {
    $("conflictNotice").hidden = false;
    $("conflictNotice").textContent = conflicts.map(record => `${record.date}: ${record.meta.sourceConflict}`).join(" / ");
  }

  $("importBtn").textContent = `${records.length}일 메뉴를 Firestore에 등록`;
  $("importBtn").disabled = !$("confirmImport").checked;
}

async function loadBundledData() {
  setStatus("datasetStatus", "등록 데이터를 불러오는 중입니다.");
  try {
    const response = await fetch("../data/menu-schedules-2026.json.gz", { cache: "no-store" });
    if (!response.ok) throw new Error("메뉴 데이터 파일을 불러오지 못했습니다.");
    if (typeof DecompressionStream === "undefined") {
      throw new Error("현재 브라우저가 압축 데이터 해제를 지원하지 않습니다. Chrome 최신 버전에서 다시 열어 주세요.");
    }
    const compressed = await response.arrayBuffer();
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
    const payload = JSON.parse(await new Response(stream).text());
    if (!Array.isArray(payload.records) || !payload.records.length) {
      throw new Error("등록할 메뉴 데이터가 비어 있습니다.");
    }

    records = payload.records.sort((a, b) => a.date.localeCompare(b.date));
    recordByDate = new Map(records.map(record => [record.date, record]));
    renderPreview();
    populateDateSelect();
    setStatus("datasetStatus", `변환 완료: ${records.length}일의 날짜별 중식·석식 데이터를 확인할 수 있습니다.`);
  } catch (error) {
    console.error("날짜별 메뉴 데이터 로드 실패:", error);
    setStatus("datasetStatus", error.message || "메뉴 데이터를 불러오지 못했습니다.", true);
  }
}

function populateDateSelect() {
  const select = $("dateSelect");
  select.replaceChildren();
  records.forEach(record => {
    const option = document.createElement("option");
    option.value = record.date;
    option.textContent = record.date;
    select.appendChild(option);
  });
  if (records.length) select.value = records[0].date;
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

async function runImport() {
  if (!$("confirmImport").checked || !records.length) return;
  if (!window.confirm(`2026년 메뉴 ${records.length}일을 등록할까요? 같은 날짜에 이미 저장된 메뉴는 이번 자료로 덮어씁니다.`)) return;

  $("importBtn").disabled = true;
  setStatus("importStatus", "Firestore에 날짜별 메뉴를 등록하고 있습니다. 화면을 닫지 말아 주세요.");
  try {
    const count = await importMenuSchedules(records);
    $("editPanel").hidden = false;
    setStatus("importStatus", `${count}일 메뉴 등록이 완료되었습니다. 날짜별 메뉴 수정도 사용할 수 있습니다.`);
    await loadSelectedDate();
    $("editPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("날짜별 메뉴 일괄 등록 실패:", error);
    setStatus("importStatus", error.message || "일괄 등록에 실패했습니다. Firestore 권한과 연결을 확인해 주세요.", true);
  } finally {
    $("importBtn").disabled = !$("confirmImport").checked;
  }
}

$("confirmImport").addEventListener("change", renderPreview);
$("importBtn").addEventListener("click", runImport);
$("loadDateBtn").addEventListener("click", loadSelectedDate);
$("saveDateBtn").addEventListener("click", saveSelectedDate);

let initialized = false;
onAuthStateChanged(auth, user => {
  if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL || initialized) return;
  initialized = true;
  loadBundledData();
});
