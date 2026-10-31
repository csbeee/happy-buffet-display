import { db } from "../firebase/firebase-config.js";
import {
  addDoc, collection, deleteField, doc, getDocs, updateDoc
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
const registrationForm = $("companyRegistrationForm");
const registrationSubmit = $("companyRegistrationSubmit");
const editSelect = $("companyEditSelect");
const editLoadButton = $("companyEditLoad");
const editCancelButton = $("companyEditCancel");
const deactivateButton = $("companyDeactivate");
const activateButton = $("companyActivate");
let editingCompanyId = null;
let companyRecords = [];

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
function renderCompanyOptions() {
  const selectedId = select.value;
  select.replaceChildren(new Option("거래처 선택", ""));
  companyRecords
    .filter((company) => typeof company.name === "string" && company.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((company) => select.append(new Option(company.active === false ? company.name + " (미사용)" : company.name, company.id)));
  if (selectedId && [...select.options].some((option) => option.value === selectedId)) select.value = selectedId;
}
function renderRosterCompanyOptions() {
  if (!rosterCompanySelect) return;
  const previous = rosterCompanySelect.value;
  rosterCompanySelect.replaceChildren(new Option("거래처 선택", ""));
  [...companyRecords].filter((company) => typeof company.name === "string" && company.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((company) => rosterCompanySelect.append(new Option(company.name, company.id)));
  if (companyRecords.some((company) => company.id === previous)) rosterCompanySelect.value = previous;
}
function renderEditCompanyOptions() {
  if (!editSelect) return;
  const previous = editSelect.value;
  editSelect.replaceChildren(new Option("거래처 선택", ""));
  [...companyRecords].sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((company) => editSelect.append(new Option(company.active === false ? company.name + " (미사용)" : company.name, company.id)));
  if (companyRecords.some((company) => company.id === previous)) editSelect.value = previous;
}
async function loadCompanyRecords() {
  setStatus("거래처 목록을 불러오는 중입니다.");
  try {
    const snapshot = await getDocs(collection(db, "companies"));
    companyRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderCompanyOptions();
    renderEditCompanyOptions();
    renderRosterCompanyOptions();
    setStatus(`거래처 ${companyRecords.length}개를 불러왔습니다. 장부 확인번호는 등록 여부만 확인할 수 있습니다.`);
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
  const configured = /^\d{3}$/.test(String(company.ledgerNumber ?? "")) || Boolean(company.accessCodeHash && company.accessCodeSalt);
  setStatus(`${company.name}: 장부 확인번호 ${configured ? "등록됨" : "미등록"}`);
  saveButton.disabled = false;
  clearButton.disabled = !configured;
}
toggle?.addEventListener("click", async () => {
  panel.hidden = !panel.hidden;
  document.body.classList.toggle("company-management-open", !panel.hidden);
  if (!panel.hidden) {
    await loadCompanyRecords();
    updateSelectionStatus();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
close?.addEventListener("click", () => {
  panel.hidden = true;
  document.body.classList.remove("company-management-open");
});
select?.addEventListener("change", updateSelectionStatus);
codeInput?.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 3);
});
saveButton?.addEventListener("click", async () => {
  const company = selectedCompany();
  const code = codeInput.value.trim();
  if (!company) { setStatus("먼저 거래처를 선택해 주세요.", true); return; }
  if (!/^\d{3}$/.test(code)) { setStatus("장부 확인번호는 숫자 3자리로 입력해 주세요. 예: 003", true); codeInput.focus(); return; }
  saveButton.disabled = true;
  setStatus(`${company.name} 장부 확인번호를 저장하고 있습니다.`);
  try {
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, "companies", company.id), {
      ledgerNumber: code, ledgerNumberUpdatedAt: updatedAt,
      accessCodeSalt: deleteField(), accessCodeHash: deleteField(), accessCodeUpdatedAt: deleteField()
    });
    company.ledgerNumber = code;
    company.ledgerNumberUpdatedAt = updatedAt;
    delete company.accessCodeSalt;
    delete company.accessCodeHash;
    delete company.accessCodeUpdatedAt;
    codeInput.value = "";
    updateSelectionStatus();
    setStatus(`${company.name} 장부 확인번호 ${code}를 저장했습니다.`);
  } catch (error) {
    console.error("거래처 비밀번호 저장 실패:", error);
    setStatus("저장하지 못했습니다. Firestore 쓰기 권한과 연결 상태를 확인해 주세요.", true);
  } finally {
    saveButton.disabled = false;
  }
});
clearButton?.addEventListener("click", async () => {
  const company = selectedCompany();
  if (!company || (!company.ledgerNumber && !company.accessCodeHash)) return;
  if (!window.confirm(`${company.name}의 장부 확인번호를 해제할까요? 해제하면 접수 화면에서 확인번호로 진입할 수 없습니다.`)) return;
  clearButton.disabled = true;
  try {
    await updateDoc(doc(db, "companies", company.id), {
      ledgerNumber: deleteField(), ledgerNumberUpdatedAt: deleteField(),
      accessCodeSalt: deleteField(), accessCodeHash: deleteField(), accessCodeUpdatedAt: deleteField()
    });
    delete company.ledgerNumber;
    delete company.ledgerNumberUpdatedAt;
    delete company.accessCodeSalt;
    delete company.accessCodeHash;
    delete company.accessCodeUpdatedAt;
    updateSelectionStatus();
    setStatus(`${company.name} 장부 확인번호를 해제했습니다.`);
  } catch (error) {
    console.error("비밀번호 해제 실패:", error);
    setStatus("비밀번호를 해제하지 못했습니다. Firestore 쓰기 권한을 확인해 주세요.", true);
  } finally {
    clearButton.disabled = false;
  }
});
saveButton.disabled = true;
clearButton.disabled = true;


// 새 거래처 등록: 기존 companies 컬렉션과 식수 접수 화면에서 바로 사용할 수 있는 필드만 저장합니다.
function normalizeCompanyName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}
function splitAliases(value) {
  return [...new Set(String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}
function resetCompanyEditor() {
  editingCompanyId = null;
  registrationForm.reset();
  $("newCompanyMealPrice").value = "7000";
  $("newCompanyActive").checked = true;
  $("newCompanyFavorite").checked = false;
  $("companyRegistrationHeading").textContent = "새 거래처 등록";
  registrationSubmit.textContent = "거래처 등록";
  editCancelButton.hidden = true;
}
function updateCompanyStateButtons(company) {
  if (deactivateButton) deactivateButton.disabled = !company || company.active === false;
  if (activateButton) { activateButton.hidden = !company || company.active !== false; activateButton.disabled = !company || company.active !== false; }
}
editSelect?.addEventListener("change", () => { const c = companyRecords.find((x) => x.id === editSelect.value) || null; select.value = c?.id || ""; updateSelectionStatus(); updateCompanyStateButtons(c); });
async function setCompanyActive(active) {
  const company = companyRecords.find((x) => x.id === editSelect.value); if (!company) return;
  const action = active ? "다시 사용" : "사용 중지";
  if (!window.confirm(company.name + " 거래처를 " + action + " 처리할까요? 과거 장부와 거래처 정보는 삭제되지 않습니다.")) return;
  if (deactivateButton) deactivateButton.disabled = true; if (activateButton) activateButton.disabled = true;
  try { await updateDoc(doc(db, "companies", company.id), { active, updatedAt: new Date().toISOString() }); company.active = active;
    $("newCompanyActive").checked = active; renderCompanyOptions(); renderEditCompanyOptions(); editSelect.value = company.id; select.value = company.id;
    updateSelectionStatus(); updateCompanyStateButtons(company); setStatus(company.name + " 거래처를 " + (active ? "다시 사용" : "사용 중지") + " 처리했습니다.");
  } catch (error) { console.error("거래처 상태 변경 실패:", error); setStatus("거래처 상태 변경에 실패했습니다. Firestore 권한을 확인해 주세요.", true); updateCompanyStateButtons(company); }
}
deactivateButton?.addEventListener("click", () => setCompanyActive(false));
activateButton?.addEventListener("click", () => setCompanyActive(true));
editLoadButton?.addEventListener("click", () => {
  const company = companyRecords.find((item) => item.id === editSelect.value);
  if (!company) { setStatus("수정할 거래처를 선택해 주세요.", true); return; }
  editingCompanyId = company.id;
  select.value = company.id; updateSelectionStatus(); updateCompanyStateButtons(company);
  $("newCompanyName").value = company.name || "";
  $("newCompanyAliases").value = Array.isArray(company.aliases) ? company.aliases.join(", ") : "";
  $("newCompanyContactName").value = company.contactName || "";
  $("newCompanyContactPhone").value = company.contactPhone || "";
  $("newCompanyMealPrice").value = company.mealPrice ?? 7000;
  $("newCompanyBillingType").value = company.billingType || "monthly";
  $("newCompanyNote").value = company.note || "";
  $("newCompanyActive").checked = company.active !== false;
  $("newCompanyFavorite").checked = company.favorite === true;
  $("companyRegistrationHeading").textContent = `거래처 정보 수정 · ${company.name}`;
  registrationSubmit.textContent = "변경사항 저장";
  editCancelButton.hidden = false;
  $("newCompanyName").focus();
  registrationForm.scrollIntoView({ behavior: "smooth", block: "start" });
});
editCancelButton?.addEventListener("click", resetCompanyEditor);
registrationForm?.addEventListener("reset", () => {
  if (editingCompanyId) setTimeout(resetCompanyEditor, 0);
});
registrationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("newCompanyName").value.trim().replace(/\s+/g, " ");
  const aliases = splitAliases($("newCompanyAliases").value);
  const contactName = $("newCompanyContactName").value.trim();
  const contactPhone = $("newCompanyContactPhone").value.trim();
  const mealPrice = Number($("newCompanyMealPrice").value);
  const billingType = $("newCompanyBillingType").value;
  const note = $("newCompanyNote").value.trim();
  const active = $("newCompanyActive").checked;
  const favorite = $("newCompanyFavorite").checked;

  if (!name) {
    setStatus("거래처명을 입력해 주세요.", true);
    $("newCompanyName").focus();
    return;
  }
  if (!Number.isFinite(mealPrice) || mealPrice < 0 || mealPrice > 1000000) {
    setStatus("1인 식대는 0원 이상 1,000,000원 이하로 입력해 주세요.", true);
    $("newCompanyMealPrice").focus();
    return;
  }
  const duplicate = companyRecords.find((company) => company.id !== editingCompanyId && normalizeCompanyName(company.name) === normalizeCompanyName(name));
  if (duplicate) {
    setStatus(`'${name}' 거래처가 이미 등록되어 있습니다. 기존 거래처를 확인해 주세요.`, true);
    return;
  }

  registrationSubmit.disabled = true;
  registrationSubmit.textContent = "등록 중…";
  setStatus(`${name} 거래처를 등록하고 있습니다.`);
  try {
    const nextSortOrder = companyRecords.reduce((max, company) => {
      const order = Number(company.sortOrder);
      return Number.isFinite(order) ? Math.max(max, order) : max;
    }, 0) + 10;
    const now = new Date().toISOString();
    const payload = {
      name,
      aliases,
      contactName,
      contactPhone,
      mealPrice,
      billingType,
      note,
      active,
      favorite,
      sortOrder: editingCompanyId ? (companyRecords.find((company) => company.id === editingCompanyId)?.sortOrder ?? nextSortOrder) : nextSortOrder,
      updatedAt: now
    };
    let savedId = editingCompanyId;
    if (editingCompanyId) {
      await updateDoc(doc(db, "companies", editingCompanyId), { ...payload, updatedAt: now });
      const index = companyRecords.findIndex((company) => company.id === editingCompanyId);
      if (index >= 0) companyRecords[index] = { ...companyRecords[index], ...payload, updatedAt: now };
    } else {
      payload.createdAt = now;
      const created = await addDoc(collection(db, "companies"), payload);
      savedId = created.id;
      companyRecords.push({ id: created.id, ...payload });
    }
    renderCompanyOptions();
    renderEditCompanyOptions();
    renderRosterCompanyOptions();
    const wasEditing = Boolean(editingCompanyId);
    editingCompanyId = null;
    registrationForm.reset();
    $("newCompanyMealPrice").value = "7000";
    $("newCompanyActive").checked = true;
    $("newCompanyFavorite").checked = false;
    registrationSubmit.textContent = "거래처 등록";
    $("companyRegistrationHeading").textContent = "새 거래처 등록";
    editCancelButton.hidden = true;
    renderEditCompanyOptions();
    select.value = savedId; editSelect.value = savedId; updateCompanyStateButtons(companyRecords.find((x) => x.id === savedId));
    updateSelectionStatus();
    setStatus(wasEditing ? "거래처 정보를 수정했습니다." : `'${name}' 거래처 등록이 완료되었습니다. 장부 확인번호는 아래에서 별도로 설정해 주세요.`);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("거래처 등록 실패:", error);
    const message = error?.code === "permission-denied"
      ? "거래처를 등록할 권한이 없습니다. Firestore 보안 규칙을 확인해 주세요."
      : "거래처 등록에 실패했습니다. 인터넷 연결과 Firestore 쓰기 권한을 확인해 주세요.";
    setStatus(message, true);
  } finally {
    registrationSubmit.disabled = false;
    registrationSubmit.textContent = editingCompanyId ? "변경사항 저장" : "거래처 등록";
  }
});

// 사전 등록 명단 관리. 명단 문서는 companyRosters 컬렉션에 저장합니다.
const rosterCompanySelect = $("rosterCompanySelect");
const rosterNamesInput = $("rosterNamesInput");
const rosterSaveButton = $("rosterSaveButton");
const rosterReloadButton = $("rosterReloadButton");
const rosterManagerStatus = $("rosterManagerStatus");
const rosterManagerList = $("rosterManagerList");
const rosterModal = $("rosterManagerModal");
$("openRosterManager")?.addEventListener("click", () => { rosterModal.hidden = false; renderRosterCompanyOptions(); rosterCompanySelect.focus(); });
$("closeRosterManager")?.addEventListener("click", () => { rosterModal.hidden = true; });
rosterModal?.addEventListener("click", (event) => { if (event.target === rosterModal) rosterModal.hidden = true; });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && rosterModal && !rosterModal.hidden) rosterModal.hidden = true; });

function setRosterStatus(message, isError = false) {
  rosterManagerStatus.textContent = message;
  rosterManagerStatus.classList.toggle("error", isError);
}
function renderRosterManagerList(members) {
  rosterManagerList.replaceChildren();
  if (!members.length) {
    rosterManagerList.textContent = "등록된 명단이 없습니다.";
    return;
  }
  members.forEach((member) => {
    const row = document.createElement("div");
    row.className = "roster-manager-row";
    const name = document.createElement("span");
    name.textContent = member.name;
    const state = document.createElement("span");
    state.textContent = member.active === false ? "미사용" : "사용 중";
    row.append(name, state);
    rosterManagerList.append(row);
  });
}
async function loadRosterManagerList() {
  const companyId = rosterCompanySelect.value;
  if (!companyId) {
    renderRosterManagerList([]);
    setRosterStatus("거래처를 선택해 주세요.");
    return;
  }
  setRosterStatus("등록 명단을 불러오는 중입니다.");
  try {
    const snapshot = await getDocs(collection(db, "companyRosters"));
    const members = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .filter((member) => member.companyId === companyId)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "ko"));
    renderRosterManagerList(members);
    setRosterStatus(`${members.length}명 등록됨`);
  } catch (error) {
    console.error("사전 명단 로드 실패:", error);
    renderRosterManagerList([]);
    setRosterStatus("명단을 불러오지 못했습니다. Firestore 읽기 권한과 보안 규칙을 확인해 주세요.", true);
  }
}
rosterCompanySelect?.addEventListener("change", loadRosterManagerList);
rosterReloadButton?.addEventListener("click", loadRosterManagerList);
rosterSaveButton?.addEventListener("click", async () => {
  const companyId = rosterCompanySelect.value;
  const company = companyRecords.find((item) => item.id === companyId);
  const names = [...new Set(rosterNamesInput.value.split(/\r?\n/).map((name) => name.trim().replace(/\\s+/g, " ")).filter(Boolean))];
  if (!company) { setRosterStatus("먼저 거래처를 선택해 주세요.", true); return; }
  if (!names.length) { setRosterStatus("등록할 이름을 한 줄에 한 명씩 입력해 주세요.", true); return; }
  rosterSaveButton.disabled = true;
  try {
    const snapshot = await getDocs(collection(db, "companyRosters"));
    const existing = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((member) => member.companyId === companyId);
    const known = new Set(existing.map((member) => normalizeCompanyName(member.name)));
    const newNames = names.filter((name) => {
      const key = normalizeCompanyName(name);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    if (!newNames.length) { setRosterStatus("새로 추가할 이름이 없습니다. 기존 명단과 중복됩니다.", true); return; }
    const now = new Date().toISOString();
    for (const [index, name] of newNames.entries()) {
      await addDoc(collection(db, "companyRosters"), {
        companyId, companyName: company.name, name, active: true,
        sortOrder: existing.length + index + 1, createdAt: now, updatedAt: now
      });
    }
    rosterNamesInput.value = "";
    setRosterStatus(`${newNames.length}명 추가 등록했습니다.`);
    await loadRosterManagerList();
  } catch (error) {
    console.error("사전 명단 저장 실패:", error);
    setRosterStatus("명단 저장에 실패했습니다. Firestore 쓰기 권한과 보안 규칙을 확인해 주세요.", true);
  } finally {
    rosterSaveButton.disabled = false;
  }
});

