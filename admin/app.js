// ============================================
// Happy Buffet Display - Admin App
// ============================================

import { getTodayMenu, saveTodayMenu, formatUpdatedAt } from "../firebase/firestore.js";
import { renderMenu, resetMenu, collectMenu, initMenuUI, createMenuItem } from "./menu-ui.js";
import { MENU_CATEGORY } from "../shared/menu-category.js";
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
const dinnerEditor = document.getElementById("dinnerEditor");
const dinnerKeys = ["soup", "main", "side", "kimchi", "dessert", "notice"];
const dinnerLabels = { soup: "국", main: "메인", side: "반찬", kimchi: "김치", dessert: "후식", notice: "공지" };

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
    currentDisplayMode = ["lunch", "dinner", "special"].includes(mode) ? mode : "lunch";
    const isSpecial = currentDisplayMode === "special";
    const isDinner = currentDisplayMode === "dinner";

    document.getElementById("lunchModeBtn")?.classList.toggle("active", currentDisplayMode === "lunch");
    document.getElementById("dinnerModeBtn")?.classList.toggle("active", isDinner);
    specialModeBtn?.classList.toggle("active", isSpecial);

    normalMenuEditor?.classList.toggle("hidden", isSpecial || isDinner);
    dinnerEditor?.classList.toggle("hidden", isSpecial || !isDinner);
    conceptEditor?.classList.toggle("hidden", !isSpecial);

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

function applyHistoryDraft() {
    let raw = null;
    try {
        raw = sessionStorage.getItem("happyBuffetHistoryDraft");
        if (!raw) return false;
        const draft = JSON.parse(raw);
        sessionStorage.removeItem("happyBuffetHistoryDraft");

        // 이력 페이지에서 불러온 데이터는 편집기에만 채웁니다.
        // 저장 버튼을 누르기 전까지 현재 전광판 메뉴는 변경되지 않습니다.
        // 먼저 모드를 전환한 뒤 이력 데이터를 렌더링해야
        // 일반 모드 전환 과정에서 현재 메뉴가 이력 데이터를 덮어쓰지 않습니다.
        setDisplayMode(draft.displayMode === "special" ? "special" : draft.displayMode === "dinner" ? "dinner" : "lunch");
        renderMenu(draft);
        restoreDinner(draft);
        restoreConcept(draft);
        if (saveInfo) {
            saveInfo.textContent = "과거 메뉴를 불러왔습니다. 수정 후 저장하면 오늘 메뉴로 적용됩니다.";
        }
        return true;
    } catch (error) {
        console.error("과거 메뉴 불러오기 실패:", error);
        try { sessionStorage.removeItem("happyBuffetHistoryDraft"); } catch (_) {}
        return false;
    }
}

/* Lunch/dinner editor helpers */
function buildDinnerMenuUI() {
    const container = document.getElementById("dinnerMenuContainer");
    if (!container || container.dataset.initialized === "true") return;
    container.dataset.initialized = "true";
    container.replaceChildren();

    for (const category of MENU_CATEGORY) {
        const card = document.createElement("section");
        card.className = "category dinner-category";

        const header = document.createElement("div");
        header.className = "category-header";
        const title = document.createElement("div");
        title.className = "category-title";
        title.textContent = category.title.replace(/^\\S+\\s*/, "저녁 · ");
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "add-btn";
        addButton.dataset.dinnerAdd = category.key;
        addButton.textContent = "+ 추가";
        header.append(title, addButton);

        const list = document.createElement("div");
        list.className = "menu-list";
        list.id = dinnerListId(category.key);
        card.append(header, list);
        container.appendChild(card);

        if (window.Sortable) {
            Sortable.create(list, {
                animation: 180,
                handle: ".drag",
                ghostClass: "dragging",
                chosenClass: "chosen",
                forceFallback: false,
                fallbackTolerance: 3
            });
        }
    }

    container.addEventListener("click", event => {
        const addButton = event.target.closest("[data-dinner-add]");
        if (addButton) {
            const list = document.getElementById(dinnerListId(addButton.dataset.dinnerAdd));
            if (list) list.appendChild(createMenuItem());
            return;
        }

        const button = event.target.closest(".menu-item button");
        const row = button?.closest(".menu-item");
        if (!button || !row) return;
        if (button.classList.contains("delete")) row.remove();
        if (button.classList.contains("up") && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
        if (button.classList.contains("down") && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    });
}

function dinnerListId(key) {
    return "dinner" + key[0].toUpperCase() + key.slice(1) + "List";
}
function collectDinnerData() {
    const dinner = {};
    for (const category of MENU_CATEGORY) {
        dinner[category.key] = [...(document.getElementById(dinnerListId(category.key))?.querySelectorAll(".menu-input") || [])]
            .map(input => input.value.trim()).filter(Boolean);
    }
    dinner.leftovers = [...document.querySelectorAll("#dinnerLeftoverChoices input[type=checkbox]:checked")]
        .map(input => ({name: input.value, category: input.dataset.category}));
    return dinner;
}
function restoreDinner(menu) {
    const dinner = menu?.dinner && typeof menu.dinner === "object" ? menu.dinner : {};
    for (const category of MENU_CATEGORY) {
        const list = document.getElementById(dinnerListId(category.key));
        if (!list) continue;
        list.replaceChildren();
        const values = Array.isArray(dinner[category.key]) ? dinner[category.key] :
            dinner[category.key] == null ? [] : [dinner[category.key]];
        if (values.length) values.forEach(value => list.appendChild(createMenuItem(typeof value === "string" ? value : String(value ?? ""))));
        else for (let i = 0; i < (category.min || 1); i++) list.appendChild(createMenuItem());
    }
    lunchDishChoices(menu || {}, dinner.leftovers || menu?.dinnerLeftovers || []);
}
function lunchDishChoices(lunchMenu, selected = []) {
    const container = document.getElementById("dinnerLeftoverChoices");
    if (!container) return;
    container.replaceChildren();
    const selectedKeys = new Set((Array.isArray(selected) ? selected : []).map(item =>
        typeof item === "string" ? item : `${item.category || ""}|${item.name || ""}`
    ));
    let count = 0;
    for (const key of ["soup", "main", "side", "kimchi", "dessert"]) {
        const items = Array.isArray(lunchMenu?.[key]) ? lunchMenu[key] : [];
        for (const rawName of items) {
            if (typeof rawName !== "string" || !rawName.trim()) continue;
            const name = rawName.trim(), uniqueKey = key + "|" + name;
            const label = document.createElement("label"); label.className = "leftover-choice";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox"; checkbox.value = name; checkbox.dataset.category = key;
            checkbox.checked = selectedKeys.has(uniqueKey) || selectedKeys.has(name);
            const text = document.createElement("span");
            text.textContent = `${dinnerLabels[key]} · ${name}`;
            label.append(checkbox, text); container.appendChild(label); count++;
        }
    }
    if (!count) {
        const empty = document.createElement("p"); empty.className = "empty-leftovers";
        empty.textContent = "먼저 일반 메뉴(점심 메뉴)를 입력하면 잔여 메뉴를 선택할 수 있습니다.";
        container.appendChild(empty);
    }
}
function bindLunchLeftoverRefresh() {
    const container = document.getElementById("menuContainer");
    if (!container) return;
    container.addEventListener("change", () => {
        const selected = [...document.querySelectorAll("#dinnerLeftoverChoices input:checked")]
            .map(input => ({name: input.value, category: input.dataset.category}));
        lunchDishChoices(collectMenu(), selected);
    });
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
            restoreDinner({});
            setDisplayMode("normal");
            updateSaveInfo(null);
            applyHistoryDraft();
            return;
        }

        // 일반 메뉴 데이터가 존재하면 먼저 렌더링합니다.
        // 현재 displayMode가 special이어도 일반 메뉴 편집 화면을 열 수 있게 합니다.
        try {
            renderMenu(menu);
            restoreDinner(menu);
            console.log("✅ 일반 메뉴 데이터 렌더링 완료");
        } catch (error) {
            console.error("일반 메뉴 데이터 렌더링 실패:", error);
        }

        if (menu.displayMode === "special") {
            restoreConcept(menu);
            setDisplayMode("special");
        } else {
            resetConceptEditor();
            setDisplayMode(menu.displayMode === "dinner" ? "dinner" : "lunch");
        }

        updateSaveInfo(menu.updatedAt);
        applyHistoryDraft();

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
                dinner: collectDinnerData(),
                ...collectConcept(),
                displayMode: "special"
            };
        } else {
            // 일반 메뉴 저장 시 기존 스페셜데이 데이터 보존
            const normalMenu = collectMenu();

            saveData = {
                ...(todayMenuData || {}),
                ...normalMenu,
                dinner: collectDinnerData(),
                displayMode: currentDisplayMode
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
    document.getElementById("lunchModeBtn")?.addEventListener("click", () => setDisplayMode("lunch"));
    document.getElementById("dinnerModeBtn")?.addEventListener("click", () => setDisplayMode("dinner"));
    specialModeBtn?.addEventListener("click", () => setDisplayMode("special"));

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
        buildDinnerMenuUI();
        console.log("② 점심·저녁 메뉴 UI 초기화 완료");
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
    bindLunchLeftoverRefresh();
    await loadToday();

    console.log("③ admin init 완료");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
