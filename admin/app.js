// ============================================
// Happy Buffet Display - Admin App
// v4.5.1 Stable hotfix
// ============================================

import {
    getTodayMenu,
    saveTodayMenu,
    formatUpdatedAt
} from "../firebase/firestore.js";

import {
    renderMenu,
    resetMenu,
    collectMenu,
    initMenuUI
} from "./menu-ui.js";

import {
    initLibraryModal,
    loadLibrary
} from "./library-modal.js";

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

function setDisplayMode(mode) {
    currentDisplayMode = mode === "special" ? "special" : "normal";
    const special = currentDisplayMode === "special";

    normalModeBtn?.classList.toggle("active", !special);
    specialModeBtn?.classList.toggle("active", special);
    normalMenuEditor?.classList.toggle("hidden", special);
    conceptEditor?.classList.toggle("hidden", !special);
}

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
            title: section
                .querySelector(".concept-section-title")
                ?.value.trim() || "",
            items: (section
                .querySelector(".concept-section-items")
                ?.value || "")
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

async function loadToday() {
    showLoading();

    try {
        const menu = await getTodayMenu();
        console.log("Today Data =", menu);

        if (!menu) {
            resetMenu();
            resetConceptEditor();
            setDisplayMode("normal");
            updateSaveInfo(null);
            return;
        }

        if (menu.displayMode === "special") {
            // 스페셜데이: 일반 메뉴 렌더링을 절대 호출하지 않음
            restoreConcept(menu);
            setDisplayMode("special");
        } else {
            // 일반 메뉴: 현재 MENU_CATEGORY 기준으로 UI를 먼저 생성한 후 렌더링
            renderMenu(menu);
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

async function saveToday() {
    showLoading();

    try {
        let saveData;

        if (currentDisplayMode === "special") {
            // 일반 메뉴 UI 오류와 관계없이 오늘의 스페셜데이를 저장
            saveData = collectConcept();
        } else {
            saveData = {
                ...collectMenu(),
                displayMode: "normal"
            };
        }

        console.log("저장 데이터:", saveData);

        await saveTodayMenu(saveData);

        const saved = await getTodayMenu();
        updateSaveInfo(saved?.updatedAt);

        alert("저장되었습니다.");

    } catch (error) {
        console.error("오늘 메뉴 저장 실패:", error);
        alert(
            "저장에 실패했습니다.\n" +
            (error?.message || error)
        );
    } finally {
        hideLoading();
    }
}

function bindEvents() {
    normalModeBtn?.addEventListener(
        "click",
        () => setDisplayMode("normal")
    );

    specialModeBtn?.addEventListener(
        "click",
        () => setDisplayMode("special")
    );

    addConceptSectionBtn?.addEventListener(
        "click",
        () => addConceptSection()
    );

    saveButton?.addEventListener(
        "click",
        saveToday
    );

    previewButton?.addEventListener(
        "click",
        () => window.open("../display/index.html", "_blank")
    );
}

async function init() {
    console.log("① admin init 시작");

    // 1. 일반 메뉴 UI 초기화
    // SortableJS 또는 메뉴 UI 오류가 발생해도 아래 스페셜데이 이벤트는 계속 연결합니다.
    try {
        initMenuUI();
        console.log("② 일반 메뉴 UI 초기화 완료");
    } catch (error) {
        console.error(
            "일반 메뉴 UI 초기화 실패:",
            error
        );
    }

    // 2. 라이브러리 기능은 독립적으로 초기화
    try {
        initLibraryModal();
        initLibraryEditor();
        await loadLibrary();
        await loadAutocomplete();
    } catch (error) {
        console.error(
            "메뉴 라이브러리 초기화 실패:",
            error
        );
    }

    // 3. 반드시 이벤트 연결
    bindEvents();

    // 4. 오늘 데이터 로드
    await loadToday();

    console.log("③ admin init 완료");
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );
} else {
    init();
}
