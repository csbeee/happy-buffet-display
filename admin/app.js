// ============================================
// Happy Buffet Display
// Version : v4.5.0
// File : admin/app.js
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

import {

    loadAutocomplete

} from "./autocomplete.js";

import {

    initLibraryEditor

} from "./library-editor.js";





/* ============================================
   DOM
============================================ */

const saveButton = document.getElementById(

    "saveBtn"

);

const previewButton = document.getElementById(

    "previewBtn"

);

const saveInfo = document.getElementById(

    "saveInfo"

);

const loading = document.getElementById(

    "loading"

);


const normalModeBtn =
    document.getElementById(
        "normalModeBtn"
    );

const specialModeBtn =
    document.getElementById(
        "specialModeBtn"
    );

const conceptEditor =
    document.getElementById(
        "conceptEditor"
    );

const conceptSubtitle =
    document.getElementById("conceptSubtitle");

const conceptSectionsList =
    document.getElementById(
        "conceptSectionsList"
    );

const addConceptSectionBtn =
    document.getElementById(
        "addConceptSectionBtn"
    );

const conceptTheme =
    document.getElementById(
        "conceptTheme"
    );

const normalMenuEditor =
    document.getElementById(
        "normalMenuEditor"
    );

let currentDisplayMode = "normal";


/* ============================================
   Loading
============================================ */

function showLoading() {

    loading.classList.remove(

        "hidden"

    );

}

function hideLoading() {

    loading.classList.add(

        "hidden"

    );

}

/* ============================================
   Save Info
============================================ */

function updateSaveInfo(timestamp) {

    if (!timestamp) {

        saveInfo.textContent =

            "저장 기록 없음";

        return;

    }

    saveInfo.textContent =

        "마지막 저장 : " +

        formatUpdatedAt(timestamp);

}

/* ============================================
   Load Today Menu
============================================ */
/* ============================================
   Load Today Menu
============================================ */
/* ============================================
   Load Today Menu
============================================ */

async function loadToday() {

    showLoading();

    try {

        const menu =
            await getTodayMenu();

        console.log(
            "★★★★★ Today Data =",
            menu
        );


        /* ========================================
           데이터 없음
        ======================================== */

        if (!menu) {

            resetMenu();

            setDisplayMode(
                "normal"
            );

            resetConceptEditor();

            return;

        }


        /* ========================================
           일반 메뉴 복원
        ======================================== */

        renderMenu(menu);


        /* ========================================
           Display Mode 복원
        ======================================== */

        const savedMode =
            menu.displayMode || "normal";

        setDisplayMode(
            savedMode
        );


        /* ========================================
           Special Concept 복원
        ======================================== */

        if (
            savedMode === "special"
        ) {

            restoreConcept(
                menu
            );

        } else {

            resetConceptEditor();

        }


        /* ========================================
           저장 시간
        ======================================== */

        updateSaveInfo(
            menu.updatedAt
        );

    }

    catch (error) {

        console.error(
            "오늘 메뉴 불러오기 실패",
            error
        );

        resetMenu();

        setDisplayMode(
            "normal"
        );

        resetConceptEditor();

    }

    finally {

        hideLoading();

    }

}

/* ============================================
   Restore Concept
============================================ */

function restoreConcept(menu) {

    const concept =
        menu.concept || {};


    /* ========================================
       Theme
    ======================================== */

    if (conceptTheme) {

        conceptTheme.value =
            concept.theme || "";

    }


    /* ========================================
       Subtitle
    ======================================== */

    if (conceptSubtitle) {

        conceptSubtitle.value =
            concept.subtitle || "";

    }


    /* ========================================
       Section 초기화
    ======================================== */

    if (conceptSectionsList) {

        conceptSectionsList.innerHTML =
            "";

    }


    /* ========================================
       Sections 복원
    ======================================== */

    if (
        Array.isArray(
            menu.sections
        )
    ) {

        menu.sections.forEach(

            section => {

                addConceptSection(
                    section
                );

            }

        );

    }

}


/* ============================================
   Reset Concept Editor
============================================ */

function resetConceptEditor() {

    if (conceptTheme) {

        conceptTheme.value =
            "custom";

    }


    if (conceptSubtitle) {

        conceptSubtitle.value =
            "";

    }


    if (conceptSectionsList) {

        conceptSectionsList.innerHTML =
            "";

    }

}


/* ============================================
   Save Today Menu
============================================ */
async function saveToday() {

    console.log("저장 시작");

    showLoading();

    try {

        const menu = collectMenu();

        const conceptData = collectConcept();

        const saveData = {

            ...menu,

            ...conceptData

        };

        console.log("메뉴 수집 완료", saveData);

        await saveTodayMenu(saveData);

        console.log("Firestore 저장 완료");

        const saved = await getTodayMenu();

        console.log("저장 데이터 확인 완료", saved);

        updateSaveInfo(saved?.updatedAt);

        alert("저장되었습니다.");

    }
    catch (error) {

        console.error("저장 오류", error);

        alert("저장에 실패했습니다.");

    }

    hideLoading();

    console.log("저장 종료");

}

/* ============================================
   Preview
============================================ */

function openPreview() {

    window.open(

        "../display/index.html",

        "_blank"

    );

}

/* ============================================
   Event
============================================ */

function bindEvents() {

    saveButton.addEventListener(

        "click",

        saveToday

    );

    previewButton.addEventListener(

        "click",

        openPreview

    );

}

/* ============================================
    Mode Change
============================================ */
/* ============================================
   Display Mode
============================================ */

function setDisplayMode(mode) {

    currentDisplayMode = mode;

    const isSpecial =
        mode === "special";


    /* ========================================
       버튼 상태
    ======================================== */

    normalModeBtn.classList.toggle(
        "active",
        !isSpecial
    );

    specialModeBtn.classList.toggle(
        "active",
        isSpecial
    );


    /* ========================================
       일반 메뉴 영역
    ======================================== */

    if (normalMenuEditor) {

        normalMenuEditor.classList.toggle(
            "hidden",
            isSpecial
        );

    }


    /* ========================================
       컨셉데이 영역
    ======================================== */

    if (conceptEditor) {

        conceptEditor.classList.toggle(
            "hidden",
            !isSpecial
        );

    }

}

normalModeBtn.addEventListener(

    "click",

    () => {

        setDisplayMode("normal");

    }

);

specialModeBtn.addEventListener(

    "click",

    () => {

        setDisplayMode("special");

    }

);


function addConceptSection(
    section = null
) {

    const row =
        document.createElement("div");

    row.className =
        "concept-section";

    row.innerHTML = `

        <div class="concept-section-header">

            <input
                class="concept-section-title"
                type="text"
                placeholder="섹션 제목"
                value="${section?.title ?? ""}">

            <button
                type="button"
                class="concept-section-delete">

                삭제

            </button>

        </div>

        <textarea
            class="concept-section-items"
            placeholder="메뉴를 한 줄씩 입력하세요.">${section?.items?.join("\n") ?? ""

        }</textarea>

    `;

    row.querySelector(

        ".concept-section-delete"

    ).addEventListener(

        "click",

        () => {

            row.remove();

        }

    );

    conceptSectionsList.appendChild(row);

}


addConceptSectionBtn.addEventListener(

    "click",

    () => {

        addConceptSection();

    }

);


function collectConcept() {

    return {

        displayMode:
            currentDisplayMode,

        concept: {

            theme:
                conceptTheme?.value?.trim()
                || "custom",

            subtitle:
                conceptSubtitle?.value?.trim()
                || ""

        },

        sections:
            collectSections()

    };

}

function collectSections() {

    return [

        ...conceptSectionsList.querySelectorAll(
            ".concept-section"
        )

    ].map(section => ({

        title:

            section.querySelector(
                ".concept-section-title"
            ).value.trim(),

        items:

            section.querySelector(
                ".concept-section-items"
            ).value
                .split("\n")
                .map(item => item.trim())
                .filter(Boolean)

    }));

}
/* ============================================
   Initialize
============================================ */

async function init() {

    console.log("① init 시작");

    showLoading();

    try {

        console.log("② UI");

        /* 관리자 UI */

        initMenuUI();

        console.log("③ Library");

        /* 메뉴 편집기 */

        initLibraryEditor();

        /* 메뉴 라이브러리 */


        initLibraryModal();
        await loadLibrary();

        console.log("④ Autocomplete");

        await loadAutocomplete();

        console.log("⑤ Today");

        await loadToday();

        console.log("⑥ Event");

        bindEvents();

        console.log("⑦ 완료");

    }

    catch (error) {

        console.error(error);

    }

    finally {

        hideLoading();

    }


}

window.addEventListener(


    "libraryChanged",

    async () => {

        console.log(

            "Library Reload"

        );

        await initLibraryModal();

    }

);


/* ============================================
   Concept Theme Change
============================================ */

if (conceptTheme) {

    conceptTheme.addEventListener(

        "change",

        () => {

            console.log(
                "Concept Theme =",
                conceptTheme.value
            );

        }

    );

}

/* ============================================
   Start
============================================ */

document.addEventListener('DOMContentLoaded', () => {
    init()

});

