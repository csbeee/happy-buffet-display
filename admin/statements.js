import {db} from "../firebase/firebase-config.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
let companies = new Map();
let currentRows = [];

const won = value => (Number(value) || 0).toLocaleString("ko-KR") + "원";
const people = value => (Number(value) || 0).toLocaleString("ko-KR") + "명";
const todayKst = () => new Intl.DateTimeFormat("en-CA", {
  timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"
}).format(new Date());

function setStatus(message,error=false) {
  $("status").textContent = message;
  $("status").classList.toggle("error",error);
}
function setDefaultMonth() { $("monthSelect").value = todayKst().slice(0,7); }

async function loadCompanies() {
  setStatus("거래처 목록을 불러오는 중입니다.");
  try {
    const snap = await getDocs(collection(db,"companies"));
    companies = new Map(snap.docs.map(doc => [doc.id,doc.data().name || doc.id]));
    const select = $("companySelect");
    select.replaceChildren(new Option("거래처 선택",""));
    [...companies].sort((a,b)=>a[1].localeCompare(b[1],"ko"))
      .forEach(([id,name])=>select.add(new Option(name,id)));
    setStatus("거래처와 정산 월을 선택해 주세요.");
  } catch(error) {
    console.error(error);
    setStatus("거래처 목록 조회 실패. Firestore 읽기 권한을 확인해 주세요. "+(error.code||""),true);
  }
}

function weekday(date) {
  const [y,m,d]=date.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR",{weekday:"short",timeZone:"UTC"})
    .format(new Date(Date.UTC(y,m-1,d)));
}

function resetTotals() {
  $("statementFoot").innerHTML = "<tr><th>월 합계</th><th>0명</th><th>0명</th><th>0명</th><th>-</th><th>0원</th><th>0원</th></tr>";
  $("summaryPeople").textContent="0명";
  $("summarySupply").textContent="0원";
  $("summaryTax").textContent="0원";
  $("summaryAmount").textContent="0원";
  $("recipientTotal").textContent="0원";
}

function renderEmpty(message) {
  const host=$("statementRows");
  host.replaceChildren();
  const tr=document.createElement("tr");
  const td=document.createElement("td");
  td.colSpan=7; td.className="empty"; td.textContent=message;
  tr.append(td); host.append(tr);
  resetTotals();
  currentRows=[];
  $("printBtn").disabled=true;
}

function renderStatement(rows,companyName,month) {
  $("previewCompany").textContent=companyName || "거래처 미선택";
  $("previewPeriod").textContent=month ? month.replace("-","년 ")+"월" : "-";
  $("issuedDate").textContent=todayKst();

  const host=$("statementRows");
  host.replaceChildren();
  if(!rows.length) {
    renderEmpty("선택한 기간에 식수 내역이 없습니다.");
    return;
  }

  rows.forEach(row=>{
    const tr=document.createElement("tr");
    const values=[
      row.date.slice(5).replace("-",".")+" ("+weekday(row.date)+")",
      people(row.lunchPeople),
      people(row.dinnerPeople),
      people(row.people),
      row.unitPrice ? won(row.unitPrice) : "-",
      won(row.amount),
      won(row.tax)
    ];
    values.forEach(value=>{
      const td=document.createElement("td");
      td.textContent=value;
      tr.append(td);
    });
    host.append(tr);
  });

  const total=rows.reduce((sum,row)=>({
    lunchPeople:sum.lunchPeople+row.lunchPeople,
    dinnerPeople:sum.dinnerPeople+row.dinnerPeople,
    people:sum.people+row.people,
    amount:sum.amount+row.amount,
    tax:sum.tax+row.tax
  }),{lunchPeople:0,dinnerPeople:0,people:0,amount:0,tax:0});
  const gross=total.amount+total.tax;
  $("statementFoot").innerHTML="<tr><th>월 합계</th><th>"+people(total.lunchPeople)+"</th><th>"+people(total.dinnerPeople)+"</th><th>"+people(total.people)+"</th><th>-</th><th>"+won(total.amount)+"</th><th>"+won(total.tax)+"</th></tr>";
  $("summaryPeople").textContent=people(total.people);
  $("summarySupply").textContent=won(total.amount);
  $("summaryTax").textContent=won(total.tax);
  $("summaryAmount").textContent=won(gross);
  $("recipientTotal").textContent=won(gross);
  currentRows=rows;
  $("printBtn").disabled=false;
}

async function buildPreview() {
  const companyId=$("companySelect").value;
  const month=$("monthSelect").value;
  if(!companyId || !month) {
    setStatus("거래처와 정산 월을 모두 선택해 주세요.",true);
    return;
  }
  const [year,monthNumber]=month.split("-").map(Number);
  const start=month+"-01";
  const end=new Date(Date.UTC(year,monthNumber,0)).toISOString().slice(0,10);
  $("previewBtn").disabled=true;
  $("printBtn").disabled=true;
  setStatus("선택한 거래처의 식수 내역을 집계하고 있습니다.");
  try {
    const q=query(collection(db,"mealEntries"),
      where("serviceDate",">=",start),where("serviceDate","<=",end));
    const snap=await getDocs(q);
    const daily=new Map();
    snap.docs.forEach(doc=>{
      const entry=doc.data();
      if(entry.companyId!==companyId) return;
      const count=Math.max(0,Number(entry.headcount)||0);
      if(!entry.serviceDate || count<=0) return;
      let day=daily.get(entry.serviceDate);
      if(!day) {
        day={date:entry.serviceDate,lunchPeople:0,dinnerPeople:0,people:0,amount:0,weightedPrice:0};
        daily.set(entry.serviceDate,day);
      }
      // 장부 금액은 부가세 별도 공급가액으로 취급합니다.
      const supply=entry.totalAmount!==undefined && entry.totalAmount!==null
        ? (Number(entry.totalAmount)||0)
        : (Number(entry.mealPrice)||0)*count;
      if(entry.mealPeriod==="dinner") day.dinnerPeople+=count;
      else day.lunchPeople+=count;
      day.people+=count;
      day.amount+=supply;
      day.weightedPrice+=(Number(entry.mealPrice)||supply/count)*count;
    });
    const rows=[...daily.values()].map(day=>({
      ...day,
      unitPrice:day.people ? Math.round(day.weightedPrice/day.people) : 0,
      tax:Math.round(day.amount*0.1)
    })).filter(day=>day.people>0).sort((a,b)=>a.date.localeCompare(b.date));
    renderStatement(rows,companies.get(companyId),month);
    setStatus(rows.length
      ? month+" · "+(companies.get(companyId)||"선택 거래처")+" · "+rows.length+"일의 내역을 미리보기로 구성했습니다."
      : month+" · 해당 거래처의 식수 내역이 없습니다.");
  } catch(error) {
    console.error("거래명세표 조회 실패:",error);
    renderEmpty("자료를 불러오지 못했습니다.");
    setStatus("거래명세표 조회 실패: Firestore 연결 또는 읽기 권한을 확인해 주세요. "+(error.code||""),true);
  } finally {
    $("previewBtn").disabled=false;
  }
}

$("previewBtn").addEventListener("click",buildPreview);
$("companySelect").addEventListener("change",buildPreview);
$("monthSelect").addEventListener("change",buildPreview);
$("printBtn").addEventListener("click",()=>{if(currentRows.length) window.print();});
setDefaultMonth();
await loadCompanies();
