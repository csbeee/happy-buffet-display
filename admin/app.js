// ============================================
// Happy Buffet Display
// Version : v4.5.1 hotfix
// File : admin/app.js
// ============================================

import { getTodayMenu, saveTodayMenu, formatUpdatedAt } from "../firebase/firestore.js";
import { renderMenu, resetMenu, collectMenu, initMenuUI } from "./menu-ui.js";
import { initLibraryModal, loadLibrary } from "./library-modal.js";
import { loadAutocomplete } from "./autocomplete.js";
import { initLibraryEditor } from "./library-editor.js";

const saveButton = document.getElementById("saveBtn");
const previewButton = document.getElementById("previewBtn");
const saveInfo = document.getElementById("saveInfo");
const loading = document.getElementById("loading");
const normalModeBtn = document.getElementById("normalModeBtn");
const specialModeBtn = document.getElementById("specialModeBtn");
const conceptEditor = document.getElementById("conceptEditor");
const conceptSubtitle = document.getElementById("conceptSubtitle");
const conceptSectionsList = document.getElementById("conceptSectionsList");
const addConceptSectionBtn = document.getElementById("addConceptSectionBtn");
const conceptTheme = document.getElementById("conceptTheme");
const normalMenuEditor = document.getElementById("normalMenuEditor");

let currentDisplayMode = "normal";

function showLoading() { loading?.classList.remove("hidden"); }
function hideLoading() { loading?.classList.add("hidden"); }

function updateSaveInfo(timestamp) {
    if (!saveInfo) return;
    saveInfo.textContent = timestamp
        ? "마지막 저장 : " + formatUpdatedAt(timestamp)
        : "저장 기록 없음";
}

function setDisplayMode(mode) {
    currentDisplayMode = mode === "special" ? "special" : "normal";
    const isSpecial = currentDisplayMode === "special";
    normalModeBtn?.classList.toggle("active", !isSpecial);
    specialModeBtn?.classList.toggle("active", isSpecial);
    normalMenuEditor?.classList.toggle("hidden", isSpecial);
    conceptEditor?.classList.toggle("hidden", !isSpecial);
}

function resetConceptEditor() {
    if (conceptTheme) conceptTheme.value = "custom";
    if (conceptSubtitle) conceptSubtitle.value = "";
    if (conceptSectionsList) conceptSectionsList.innerHTML = "";
}

function addConceptSection(section = null) {
    if (!conceptSectionsList) return;
    const row = document.createElement("div");
    row.className = "concept-section";
    row.innerHTML = `
        <div class="concept-section-header">
            <input class="concept-section-title" type="text" placeholder="섹션 제목" value="${section?.title ?? ""}">
            <button type="button" class="concept-section-delete">삭제</button>
        </div>
        <textarea class="concept-section-items" placeholder="메뉴를 한 줄씩 입력하세요.">${Array.isArray(section?.items) ? section.items.join("\n") : ""}</textarea>
    `;
    row.querySelector(".concept-section-delete")?.addEventListener("click", () => row.remove());
    conceptSectionsList.appendChild(row);
}

function collectSections() {
    if (!conceptSectionsList) return [];
    return [...conceptSectionsList.querySelectorAll(".concept-section")].map(section => ({
        title: section.querySelector(".concept-section-title")?.value.trim() || "",
        items: (section.querySelector(".concept-section-items")?.value || "")
            .split("\n").map(item => item.trim()).filter(Boolean)
    }));
}

function collectConcept() {
    return {
        displayMode: currentDisplayMode,
        concept: {
            theme: conceptTheme?.value?.trim() || "custom",
            subtitle: conceptSubtitle?.value?.trim() || ""
        },
        sections: collectSections()
    };
}

function restoreConcept(menu) {
    const concept = menu?.concept || {};
    if (conceptTheme) conceptTheme.value = concept.theme || "custom";
    if (conceptSubtitle) conceptSubtitle.value = concept.subtitle || "";
    if (conceptSectionsList) {
        conceptSectionsList.innerHTML = "";
        if (Array.isArray(menu?.sections)) menu.sections.forEach(addConceptSection);
    }
}

async function loadToday() {
    showLoading();
    try {
        const menu = await getTodayMenu();
        console.log("Today Data =", menu);

        if (!menu) {
            resetMenu();
            resetConceptEditor();
            setDisplayMode("normal");
            return;
        }

        const savedMode = menu.displayMode || "normal";

        // 핵심 수정: 스페셜데이에서는 일반 메뉴 렌더링을 호출하지 않습니다.
        if (savedMode === "special") {
            restoreConcept(menu);
            setDisplayMode("special");
        } else {
            renderMenu(menu);
            resetConceptEditor();
            setDisplayMode("normal");
        }

        updateSaveInfo(menu.updatedAt);
    } catch (error) {
        console.error("오늘 메뉴 불러오기 실패", error);
    } finally {
        hideLoading();
    }
}

async function saveToday() {
    console.log("저장 시작 / mode:", currentDisplayMode);
    showLoading();
    try {
        let saveData;

        // 핵심 수정: 스페셜데이 저장 시 collectMenu()를 호출하지 않습니다.
        // 일반 메뉴 UI가 고장나 있어도 오늘의 스페셜데이를 저장할 수 있습니다.
        if (currentDisplayMode === "special") {
            saveData = collectConcept();
        } else {
            saveData = {
                ...collectMenu(),
                displayMode: "normal"
            };
        }

        console.log("저장 데이터:", saveData);
        await saveTodayMenu(saveData);
        console.log("Firestore 저장 완료");

        const saved = await getTodayMenu();
        updateSaveInfo(saved?.updatedAt);
        alert("저장되었습니다.");
    } catch (error) {
        console.error("저장 오류", error);
        alert("저장에 실패했습니다.\n" + (error?.message || error));
    } finally {
        hideLoading();
        console.log("저장 종료");
    }
}

function openPreview() {
    window.open("../display/index.html", "_blank");
}

function bindEvents() {
    normalModeBtn?.addEventListener("click", () => setDisplayMode("normal"));
    specialModeBtn?.addEventListener("click", () => setDisplayMode("special"));
    addConceptSectionBtn?.addEventListener("click", () => addConceptSection());
    saveButton?.addEventListener("click", saveToday);
    previewButton?.addEventListener("click", openPreview);
}

async function init() {
    console.log("① admin init 시작");

    // 일반 메뉴 초기화 실패가 스페셜데이까지 막지 않도록 분리합니다.
    try {
        initMenuUI();
    } catch (error) {
        console.error("일반 메뉴 UI 초기화 실패. 스페셜데이는 계속 사용할 수 있습니다.", error);
    }

    try {
        initLibraryModal();
        initLibraryEditor();
        await loadLibrary();
        await loadAutocomplete();
    } catch (error) {
        console.error("메뉴 라이브러리 초기화 실패:", error);
    }

    // 반드시 일반 메뉴 초기화 이후에도 이벤트를 연결합니다.
    bindEvents();
    await loadToday();
    console.log("② admin init 완료");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
