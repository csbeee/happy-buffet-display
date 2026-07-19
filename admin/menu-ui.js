// ============================================
// Happy Buffet Display
// Admin v4.5.0
// menu-ui.js
// ============================================

import {

    MENU_CATEGORY

} from "../shared/menu-category.js";

import {

    openLibrary

} from "./library-modal.js";

import {

    attachAutocomplete

} from "./autocomplete.js";

/* ============================================
   DOM
============================================ */

const container = document.getElementById(

    "menuContainer"

);

/* ============================================
   Util
============================================ */

function createElement(tag, className = "") {

    const el = document.createElement(tag);

    if (className) {

        el.className = className;

    }

    return el;

}

function createButton(text, className) {

    const button = createElement(

        "button",

        className

    );

    button.type = "button";

    button.textContent = text;

    return button;

}

function getList(categoryKey) {

    return document.getElementById(

        `${categoryKey}List`

    );

}

/* ============================================
   Category Card
============================================ */

export function renderCategory() {

    container.innerHTML = "";

    MENU_CATEGORY.forEach(category => {

        const card = createElement(

            "section",

            "category"

        );

        /* Header */

        const header = createElement(

            "div",

            "category-header"

        );

        const title = createElement(

            "div",

            "category-title"

        );

        title.textContent = category.title;

        const addBtn = createButton(

            "+ 추가",

            "add-btn"

        );

        addBtn.dataset.category = category.key;

        addBtn.addEventListener(

            "click",

            () => {

                addMenu(category.key);

            }

        );

        header.append(

            title,

            addBtn

        );

        /* Menu List */

        const list = createElement(

            "div",

            "menu-list"

        );

        list.id = category.key + "List";

        card.append(

            header,

            list

        );

        container.appendChild(card);

    });

}

/* ============================================
   Menu Item
============================================ */

export function createMenuItem(value = "") {

    const row = createElement(

        "div",

        "menu-item"

    );


    /* Drag */

    const drag = createElement(

        "span",

        "drag"

    );

    drag.textContent = "☰";


    /* Input */

    const input = document.createElement(

        "input"

    );

    input.type = "text";

    input.className = "menu-input";

    input.placeholder = "메뉴 입력";

    input.value = value;



    /* Search */

    const searchBtn = createButton(

        "🔍",

        "icon-btn search"

    );

    searchBtn.title = "메뉴 라이브러리";


    searchBtn.addEventListener(

        "click",

        () => {

            openLibrary(input);

        }

    );



    /* Up */

    const upBtn = createButton(

        "▲",

        "icon-btn up"

    );



    /* Down */

    const downBtn = createButton(

        "▼",

        "icon-btn down"

    );



    /* Delete */

    const deleteBtn = createButton(

        "✕",

        "icon-btn delete"

    );



    row.append(

        drag,

        input,

        searchBtn,

        upBtn,

        downBtn,

        deleteBtn

    );


    /*
        중요:
        input이 DOM에 연결된 이후
        autocomplete 실행
    */

    attachAutocomplete(input);



    return row;

}

/* ============================================
   Menu Add
============================================ */

export function addMenu(categoryKey, value = "") {

    const list = getList(categoryKey);

    if (!list) return;

    list.appendChild(

        createMenuItem(value)

    );

}

/* ============================================
   Menu Delete
============================================ */

function deleteMenu(row) {

    if (!row) return;

    row.remove();

}

/* ============================================
   Move Up
============================================ */

function moveUp(row) {

    const prev = row.previousElementSibling;

    if (!prev) return;

    row.parentNode.insertBefore(

        row,

        prev

    );

}

/* ============================================
   Move Down
============================================ */

function moveDown(row) {

    const next = row.nextElementSibling;

    if (!next) return;

    row.parentNode.insertBefore(

        next,

        row

    );

}

/* ============================================
   Menu Events
============================================ */

export function initMenuEvents() {

    container.addEventListener(

        "click",

        (event) => {

            const button = event.target.closest("button");

            if (!button) return;

            const row = button.closest(".menu-item");

            if (!row) return;

            /* 삭제 */

            if (button.classList.contains("delete")) {

                deleteMenu(row);

                return;

            }

            /* 위 */

            if (button.classList.contains("up")) {

                moveUp(row);

                return;

            }

            /* 아래 */

            if (button.classList.contains("down")) {

                moveDown(row);

                return;

            }

        }

    );

}

/* ============================================
   Sortable
============================================ */

export function initSortable() {

    MENU_CATEGORY.forEach(category => {

        const list = getList(category.key);

        if (!list) return;

        Sortable.create(

            list,

            {

                animation: 180,

                handle: ".drag",

                ghostClass: "dragging",

                chosenClass: "chosen",

                forceFallback: true,

                fallbackTolerance: 3

            }

        );

    });

}

/* ============================================
   Initialize (초기화 버튼 연동 완료)
============================================ */
export function initMenuUI() {
    // 1. 기존 UI 초기화 로직 실행
    renderCategory();
    initMenuEvents();
    initSortable();

    // 2. 🚨 [추가] 초기화 버튼 이벤트 바인딩
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        // 중복 방지를 위해 안전하게 이벤트를 제거 후 다시 연결합니다.
        resetBtn.removeEventListener("click", resetMenu);
        resetBtn.addEventListener("click", () => {
            if (confirm("작성 중인 메뉴를 모두 지우고 초기화하시겠습니까?")) {
                resetMenu(); // 사용자가 정의한 resetMenu() 호출
                
                // 관리자 페이지에 공지사항 입력창(noticeInput)이 있다면 함께 비워줍니다.
                const noticeInput = document.getElementById("noticeInput");
                if (noticeInput) noticeInput.value = "";
            }
        });
        console.log("✅ 초기화 버튼(resetBtn) 이벤트 연결 성공!");
    } else {
        console.error("❌ HTML에서 id='resetBtn' 버튼을 찾을 수 없습니다.");
    }
}

/* ============================================
   Firestore 저장 데이터 생성
============================================ */

export function collectMenu() {

    const menu = {};

    MENU_CATEGORY.forEach(category => {

        const key = category.key;

        const list = getList(key);

        if (!list) {

            menu[key] = [];

            return;

        }

        const inputs = list.querySelectorAll(".menu-input");

        menu[key] = [];

        inputs.forEach(input => {

            const value = input.value.trim();

            if (value !== "") {

                menu[key].push(value);

            }

        });

    });

    return menu;

}

/* ============================================
   Firestore 데이터 표시
============================================ */
/* ============================================
   Firestore 데이터 표시 (안전성 강화 버전)
============================================ */
export function renderMenu(menu = {}) {
    MENU_CATEGORY.forEach(category => {
        const key = category.key;
        const list = getList(key);
        if (!list) return;

        list.innerHTML = "";
        let items = menu[key];

        if (items == null) {
            items = [];
        } else if (!Array.isArray(items)) {
            items = [items];
        }

        if (items.length === 0) {
            addMenu(key);
            return;
        }

        if (Array.isArray(items)) {
            items.forEach(item => {
                // 🚨 [핵심 안전장치] item이 문자열이 아니거나 undefined/null이면 빈 문자열로, 
                // 문자열이라면 양쪽 공백을 제거(.trim())해서 안전하게 넘겨줍니다.
                const safeItem = typeof item === "string" ? item.trim() : (item ? String(item).trim() : "");
                
                // 기존 item 대신 안전하게 가공된 safeItem을 넘겨줍니다.
                addMenu(key, safeItem);
            });
        } else {
            console.error(
                key,
                "배열이 아닙니다.",
                items
            );
        }
    });
}

/* ============================================
   전체 초기화
============================================ */

export function clearMenu() {

    MENU_CATEGORY.forEach(category => {

        const list = getList(category.key);

        if (list) {

            list.innerHTML = "";

        }

    });

}

/* ============================================
   기본 입력칸 생성
============================================ */

export function resetMenu() {

    clearMenu();

    MENU_CATEGORY.forEach(category => {

        const count = category.min || 1;

        for (let i = 0; i < count; i++) {

            addMenu(category.key);

        }

    });

}

/* ============================================
   카테고리 목록 반환
============================================ */

export function getMenuLists() {

    const result = {};

    MENU_CATEGORY.forEach(category => {

        result[category.key] = getList(category.key);

    });

    return result;

}

/* ============================================
   메뉴 개수
============================================ */

export function getMenuCount(categoryKey) {

    const list = getList(categoryKey);

    if (!list) return 0;

    return list.querySelectorAll(".menu-item").length;

}

/* ============================================
   Export
============================================ */

export default {

    renderCategory,

    createMenuItem,

    addMenu,

    collectMenu,

    renderMenu,

    clearMenu,

    resetMenu,

    initSortable,

    initMenuUI,

    getMenuLists,

    getMenuCount

};