import { db } from "../firebase/firebase-config.js";
import {
  collection, deleteField, doc, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const panel = $("companyManagerPanel");
const toggle = $("companyManagerToggle");
const close = $("companyManagerClose");
const select = $("companyManagerSelect");
const codeInput = $("companyManagerCode");
const saveButton = $("companyManagerSave");
const clearButton = $("companyManagerClear");
const status = $("companyManagerStatus");
let companyRecords = [];

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
function renderCompanyOptions() {
  const selectedId = select.value;
  select.replaceChildren(new Option("거래처 선택", ""));
  companyRecords
    .filter((company) => company.active !== false && typeof company.name === "string" && company.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((company) => select.append(new Option(company.name, company.id)));
  if (selectedId && [...select.options].some((option) => option.value === selectedId)) select.value = selectedId;
}
async function loadCompanyRecords() {
  setStatus("거래처 목록을 불러오는 중입니다.");
  try {
    const snapshot = await getDocs(collection(db, "companies"));
    companyRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderCompanyOptions();
    setStatus(`거래처 ${companyRecords.length}개를 불러왔습니다. 비밀번호는 등록 여부만 확인할 수 있습니다.`);
  } catch (error) {
    console.error("거래처 관리 목록 로드 실패:", error);
    setStatus("거래처 목록을 불러오지 못했습니다. Firestore 읽기 권한을 확인해 주세요.", true);
  }
}
function selectedCompany() {
  return companyRecords.find((company) => company.id === select.value) || null;
}
function updateSelectionStatus() {
  codeInput.value = "";
  const company = selectedCompany();
  if (!company) {
    setStatus("거래처를 선택해 주세요.");
    saveButton.disabled = true;
    clearButton.disabled = true;
    return;
  }
  const configured = Boolean(company.accessCodeHash && company.accessCodeSalt);
  setStatus(`${company.name}: 비밀번호 ${configured ? "등록됨" : "미등록"}`);
  saveButton.disabled = false;
  clearButton.disabled = !configured;
}
function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function makeCodeHash(code) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const data = new TextEncoder().encode(salt + ":" + code);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return { salt, hash: bytesToHex(new Uint8Array(digest)) };
}
toggle?.addEventListener("click", async () => {
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    await loadCompanyRecords();
    updateSelectionStatus();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
close?.addEventListener("click", () => { panel.hidden = true; });
select?.addEventListener("change", updateSelectionStatus);
codeInput?.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\\D/g, "").slice(0, 4);
});
saveButton?.addEventListener("click", async () => {
  const company = selectedCompany();
  const code = codeInput.value.trim();
  if (!company) { setStatus("먼저 거래처를 선택해 주세요.", true); return; }
  if (!/^\\d{4}$/.test(code)) { setStatus("비밀번호는 숫자 4자리로 입력해 주세요.", true); codeInput.focus(); return; }
  saveButton.disabled = true;
  setStatus(`${company.name} 비밀번호를 저장하고 있습니다.`);
  try {
    const { salt, hash } = await makeCodeHash(code);
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, "companies", company.id), {
      accessCodeSalt: salt, accessCodeHash: hash, accessCodeUpdatedAt: updatedAt
    });
    company.accessCodeSalt = salt;
    company.accessCodeHash = hash;
    company.accessCodeUpdatedAt = updatedAt;
    codeInput.value = "";
    updateSelectionStatus();
    setStatus(`${company.name} 비밀번호를 저장했습니다. 실제 비밀번호는 다시 표시되지 않습니다.`);
  } catch (error) {
    console.error("거래처 비밀번호 저장 실패:", error);
    setStatus("저장하지 못했습니다. Firestore 쓰기 권한과 연결 상태를 확인해 주세요.", true);
  } finally {
    saveButton.disabled = false;
  }
});
clearButton?.addEventListener("click", async () => {
  const company = selectedCompany();
  if (!company || !company.accessCodeHash) return;
  if (!window.confirm(`${company.name}의 비밀번호를 해제할까요? 해제하면 접수 화면에서 비밀번호로 진입할 수 없습니다.`)) return;
  clearButton.disabled = true;
  try {
    await updateDoc(doc(db, "companies", company.id), {
      accessCodeSalt: deleteField(), accessCodeHash: deleteField(), accessCodeUpdatedAt: deleteField()
    });
    delete company.accessCodeSalt;
    delete company.accessCodeHash;
    delete company.accessCodeUpdatedAt;
    updateSelectionStatus();
    setStatus(`${company.name} 비밀번호를 해제했습니다.`);
  } catch (error) {
    console.error("비밀번호 해제 실패:", error);
    setStatus("비밀번호를 해제하지 못했습니다. Firestore 쓰기 권한을 확인해 주세요.", true);
  } finally {
    clearButton.disabled = false;
  }
});
saveButton.disabled = true;
clearButton.disabled = true;
