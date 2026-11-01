import {db} from "../firebase/firebase-config.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let companies = new Map();
let currentRows = [];

const won = (value) => (Number(value) || 0).toLocaleString("ko-KR") + "원";
const people = (value) => (Number(value) || 0).toLocaleString("ko-KR") + "명";
const todayKst = () => new Intl.DateTimeFormat("en-CA", {
  timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
}).format(new Date());

function setStatus(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function setDefaultMonth() {
  $("monthSelect").value = todayKst().slice(0, 7);
}

async function loadCompanies() {
  setStatus("거래처 목록을 불러오는 중입니다.");
  try {
    const snapshot = await getDocs(collection(db, "companies"));
    companies = new Map(snapshot.docs.map((item) => [item.id, item.data().name || item.id]));
    const select = $("companySelect");
    select.replaceChildren(new Option("거래처 선택", ""));
    [...companies].sort((a,b) => a[1].localeCompare(b[1], "ko"))
      .forEach(([id, name]) => select.add(new Option(name, id)));
    setStatus("거래처를 선택하고 정산 월을 지정해 주세요.");
  } catch (error) {
    console.error("거래처 목록 조회 실패:", error);
    setStatus("거래처 목록을 불러오지 못했습니다. Firestore 읽기 권한을 확인해 주세요. " + (error.code || ""), true);
  }
}

function dateLabel(date) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("ko-KR", {weekday:"short", timeZone:"UTC"}).format(value);
}

function renderEmpty(message) {
  $("statementRows").replaceChildren();
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 8;
  td.className = "empty";
  td.textContent = message;
  tr.append(td);
  $("statementRows").append(tr);
  $("statementFoot").innerHTML = "<tr><th colspan=\"2\">월 합계</th><th>0명</th><th>0원</th><th>0명</th><th>0원</th><th>0명</th><th>0원</th></tr>";
  $("summaryPeople").textContent = "0명";
  $("summaryAmount").textContent = "0원";
  currentRows = [];
  $("printBtn").disabled = true;
}

function renderStatement(rows, companyName, month) {
  const host = $("statementRows");
  host.replaceChildren();
  if (!rows.length) {
    renderEmpty("선택한 기간에 식수 내역이 없습니다.");
  } else {
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const values = [
        row.date.slice(5).replace("-", "."),
        dateLabel(row.date),
        people(row.lunchPeople),
        won(row.lunchAmount),
        people(row.dinnerPeople),
        won(row.dinnerAmount),
        people(row.people),
        won(row.amount)
      ];
      values.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      host.append(tr);
    });
    const total = rows.reduce((sum, row) => ({
      lunchPeople:sum.lunchPeople + row.lunchPeople,
      lunchAmount:sum.lunchAmount + row.lunchAmount,
      dinnerPeople:sum.dinnerPeople + row.dinnerPeople,
      dinnerAmount:sum.dinnerAmount + row.dinnerAmount,
      people:sum.people + row.people,
      amount:sum.amount + row.amount
    }), {lunchPeople:0,lunchAmount:0,dinnerPeople:0,dinnerAmount:0,people:0,amount:0});
    $("statementFoot").innerHTML = "<tr><th colspan=\"2\">월 합계</th><th>" + people(total.lunchPeople) + "</th><th>" + won(total.lunchAmount) + "</th><th>" + people(total.dinnerPeople) + "</th><th>" + won(total.dinnerAmount) + "</th><th>" + people(total.people) + "</th><th>" + won(total.amount) + "</th></tr>";
    $("summaryPeople").textContent = people(total.people);
    $("summaryAmount").textContent = won(total.amount);
    currentRows = rows;
    $("printBtn").disabled = false;
  }
  $("previewCompany").textContent = companyName || "거래처 미선택";
  $("previewPeriod").textContent = month ? month.replace("-", "년 ") + "월" : "-";
  $("issuedDate").textContent = todayKst();
}

async function buildPreview() {
  const companyId = $("companySelect").value;
  const month = $("monthSelect").value;
  if (!companyId || !month) {
    setStatus("거래처와 정산 월을 모두 선택해 주세요.", true);
    return;
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const start = month + "-01";
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  $("previewBtn").disabled = true;
  $("printBtn").disabled = true;
  setStatus("선택한 거래처의 월별 식수 자료를 집계하고 있습니다.");
  try {
    const q = query(
      collection(db, "mealEntries"),
      where("companyId", "==", companyId),
      where("serviceDate", ">=", start),
      where("serviceDate", "<=", end)
    );
    const snapshot = await getDocs(q);
    const map = new Map();
    snapshot.docs.forEach((docSnap) => {
      const entry = docSnap.data();
      const count = Math.max(0, Number(entry.headcount) || 0);
      if (!entry.serviceDate || count <= 0) return;
      let day = map.get(entry.serviceDate);
      if (!day) {
        day = {date:entry.serviceDate,lunchPeople:0,lunchAmount:0,dinnerPeople:0,dinnerAmount:0,people:0,amount:0};
        map.set(entry.serviceDate, day);
      }
      const amount = entry.totalAmount !== undefined && entry.totalAmount !== null
        ? Number(entry.totalAmount) || 0
        : (Number(entry.mealPrice) || 0) * count;
      if (entry.mealPeriod === "dinner") {
        day.dinnerPeople += count;
        day.dinnerAmount += amount;
      } else {
        day.lunchPeople += count;
        day.lunchAmount += amount;
      }
      day.people += count;
      day.amount += amount;
    });
    const rows = [...map.values()].sort((a,b) => a.date.localeCompare(b.date));
    renderStatement(rows, companies.get(companyId), month);
    setStatus(rows.length
      ? month + " · " + (companies.get(companyId) || "선택 거래처") + " · " + rows.length + "일의 식수 내역을 미리보기로 구성했습니다."
      : month + " · 해당 거래처의 식수 내역이 없습니다.");
  } catch (error) {
    console.error("거래명세서 자료 조회 실패:", error);
    renderEmpty("자료를 불러오지 못했습니다.");
    setStatus("거래명세서 조회 실패: Firestore 연결 또는 읽기 권한을 확인해 주세요. " + (error.code || ""), true);
  } finally {
    $("previewBtn").disabled = false;
  }
}

$("previewBtn").addEventListener("click", buildPreview);
$("companySelect").addEventListener("change", buildPreview);
$("monthSelect").addEventListener("change", buildPreview);
$("printBtn").addEventListener("click", () => {
  if (!currentRows.length) return;
  window.print();
});

setDefaultMonth();
await loadCompanies();
