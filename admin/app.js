// ============================================
// Happy Buffet Display - Admin App
// ============================================

import { getTodayMenu, saveTodayMenu, formatUpdatedAt } from "../firebase/firestore.js";
import { renderMenu, resetMenu, collectMenu, initMenuUI } from "./menu-ui.js";
import { initLibraryModal, loadLibrary } from "./library-modal.js";
import { loadAutocomplete } from "./autocomplete.js";

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
let todayMenuData = null;

function showLoading() {
    loading?.classList.remove("hidden");
}

function hideLoading() {
    loading?.classList.add("hidden");
}

function updateSaveInfo(timestamp) {
    if (!saveInfo) return;

    saveInfo.textContent = timestamp
        ? `마지막 저장 : ${formatUpdatedAt(timestamp)}`
        : "저장 기록 없음";
}

/* ============================================
   Mode UI
   - 모드 전환은 화면만 변경
   - Firestore 데이터는 저장 버튼을 누를 때만 변경
============================================ */

function setDisplayMode(mode) {
    currentDisplayMode = mode === "special" ? "special" : "normal";
    const isSpecial = currentDisplayMode === "special";

    normalModeBtn?.classList.toggle("active", !isSpecial);
    specialModeBtn?.classList.toggle("active", isSpecial);

    normalMenuEditor?.classList.toggle("hidden", isSpecial);
    conceptEditor?.classList.toggle("hidden", !isSpecial);

    // 모드 전환 시에도 기존 일반 메뉴 데이터를 다시 화면에 채웁니다.
    // 현재 Firestore 문서가 special이어도 일반 메뉴 필드가 함께 존재한다면 표시할 수 있습니다.
    if (!isSpecial && todayMenuData) {
        renderMenu(todayMenuData);
    }
}

/* ============================================
   Special Day Editor
============================================ */

function resetConceptEditor() {
    if (conceptTheme) conceptTheme.value = "custom";
    if (conceptSubtitle) conceptSubtitle.value = "";
    if (conceptSectionsList) conceptSectionsList.innerHTML = "";
}

function addConceptSection(section = {}) {
    if (!conceptSectionsList) return;

    const row = document.createElement("div");
    row.className = "concept-section";

    const header = document.createElement("div");
    header.className = "concept-section-header";

    const title = document.createElement("input");
    title.type = "text";
    title.className = "concept-section-title";
    title.placeholder = "섹션 제목";
    title.value = section.title || "";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "concept-section-delete";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => row.remove());

    const items = document.createElement("textarea");
    items.className = "concept-section-items";
    items.placeholder = "메뉴를 한 줄씩 입력하세요.";
    items.value = Array.isArray(section.items)
        ? section.items.join("\n")
        : "";

    header.append(title, remove);
    row.append(header, items);
    conceptSectionsList.appendChild(row);
}

function collectSections() {
    if (!conceptSectionsList) return [];

    return [...conceptSectionsList.querySelectorAll(".concept-section")]
        .map(section => ({
            title: section.querySelector(".concept-section-title")?.value.trim() || "",
            items: (section.querySelector(".concept-section-items")?.value || "")
                .split("\n")
                .map(item => item.trim())
                .filter(Boolean)
        }))
        .filter(section => section.title || section.items.length);
}

function collectConcept() {
    return {
        displayMode: "special",
        concept: {
            theme: conceptTheme?.value || "custom",
            subtitle: conceptSubtitle?.value.trim() || ""
        },
        sections: collectSections()
    };
}

function restoreConcept(menu) {
    const concept = menu?.concept || {};

    if (conceptTheme) {
        conceptTheme.value = concept.theme || "custom";
    }

    if (conceptSubtitle) {
        conceptSubtitle.value = concept.subtitle || "";
    }

    if (conceptSectionsList) {
        conceptSectionsList.innerHTML = "";

        if (Array.isArray(menu?.sections)) {
            menu.sections.forEach(addConceptSection);
        }
    }
}

/* ============================================
   Load Today
   중요:
   - 일반 메뉴와 스페셜데이 데이터가 같은 문서에 존재하면
     둘 다 먼저 보존합니다.
   - 현재 displayMode가 special이어도 일반 메뉴 데이터는 render 가능
============================================ */

async function loadToday() {
    showLoading();

    try {
        const menu = await getTodayMenu();
        todayMenuData = menu;

        console.log("Today Data =", menu);

        if (!menu) {
            resetMenu();
            resetConceptEditor();
            setDisplayMode("normal");
            updateSaveInfo(null);
            return;
        }

        // 일반 메뉴 데이터가 존재하면 먼저 렌더링합니다.
        // 현재 displayMode가 special이어도 일반 메뉴 편집 화면을 열 수 있게 합니다.
        try {
            renderMenu(menu);
            console.log("✅ 일반 메뉴 데이터 렌더링 완료");
        } catch (error) {
            console.error("일반 메뉴 데이터 렌더링 실패:", error);
        }

        if (menu.displayMode === "special") {
            restoreConcept(menu);
            setDisplayMode("special");
        } else {
            resetConceptEditor();
            setDisplayMode("normal");
        }

        updateSaveInfo(menu.updatedAt);

    } catch (error) {
        console.error("오늘 메뉴 불러오기 실패:", error);
    } finally {
        hideLoading();
    }
}

/* ============================================
   Save
   - 일반 메뉴 저장 시 기존 special 데이터는 보존
   - 스페셜데이 저장 시 기존 일반 메뉴 데이터는 보존
============================================ */

async function saveToday() {
    showLoading();

    try {
        let saveData;

        if (currentDisplayMode === "special") {
            // 스페셜데이 저장 시 기존 일반 메뉴 데이터 보존
            const normalMenu = collectMenu();

            saveData = {
                ...(todayMenuData || {}),
                ...normalMenu,
                ...collectConcept(),
                displayMode: "special"
            };
        } else {
            // 일반 메뉴 저장 시 기존 스페셜데이 데이터 보존
            const normalMenu = collectMenu();

            saveData = {
                ...(todayMenuData || {}),
                ...normalMenu,
                displayMode: "normal"
            };
        }

        console.log("저장 데이터:", saveData);

        await saveTodayMenu(saveData);

        todayMenuData = await getTodayMenu();
        updateSaveInfo(todayMenuData?.updatedAt);

        alert("저장되었습니다.");

    } catch (error) {
        console.error("오늘 메뉴 저장 실패:", error);
        alert("저장에 실패했습니다.\n" + (error?.message || error));
    } finally {
        hideLoading();
    }
}

/* ============================================
   Events
============================================ */

function bindEvents() {
    normalModeBtn?.addEventListener("click", () => {
        setDisplayMode("normal");
    });

    specialModeBtn?.addEventListener("click", () => {
        setDisplayMode("special");
    });

    addConceptSectionBtn?.addEventListener("click", () => {
        addConceptSection();
    });

    saveButton?.addEventListener("click", saveToday);

    previewButton?.addEventListener("click", () => {
        window.open("../display/index.html", "_blank");
    });
}

/* ============================================
   Init
============================================ */

async function init() {
    console.log("① admin init 시작");

    try {
        initMenuUI();
        console.log("② 일반 메뉴 UI 초기화 완료");
    } catch (error) {
        console.error("일반 메뉴 UI 초기화 실패:", error);
    }

    try {
        initLibraryModal();
        await loadLibrary();
        await loadAutocomplete();
    } catch (error) {
        console.error("메뉴 라이브러리 초기화 실패:", error);
    }

    bindEvents();
    await loadToday();

    console.log("③ admin init 완료");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
