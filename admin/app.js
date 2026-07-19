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
async function loadToday() {

    showLoading();

    try {

        const menu = await getTodayMenu();


        console.log("★★★★★ Today Data =", menu);



        if (menu) {

            renderMenu(menu);

            updateSaveInfo(
                menu.updatedAt
            );

        } else {

            resetMenu();

        }

    }

    catch (error) {

        console.error(error);

        resetMenu();

    }

    hideLoading();

}

/* ============================================
   Save Today Menu
============================================ */
async function saveToday() {

    console.log("저장 시작");

    showLoading();

    try {

        const menu = collectMenu();

        console.log("메뉴 수집 완료", menu);

        await saveTodayMenu(menu);

        console.log("Firestore 저장 완료");

        const saved = await getTodayMenu();

        console.log("저장 데이터 확인 완료", saved);

        updateSaveInfo(saved?.updatedAt);

        alert("저장되었습니다.");

    }
    catch(error){

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

    catch(error){

        console.error(error);

    }

    finally{

        hideLoading();

    }

    document.addEventListener('DOMContentLoaded', () => {
        init(); 
    });


    window.addEventListener(


        "libraryChanged",

        async () => {

            console.log(

                "Library Reload"

            );

            await initLibraryModal();

        }

    );

}


/* ============================================
   Start
============================================ */

document.addEventListener('DOMContentLoaded', () => {
    init()
  
});