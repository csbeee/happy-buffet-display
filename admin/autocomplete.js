// ============================================
// Happy Buffet Display - Admin Autocomplete
// ============================================

import { getMenuLibrary } from "../firebase/firestore.js";

let library = [];
let selectedIndex = -1;
let activeBox = null;
let activeInput = null;

export async function loadAutocomplete() {
    library = await getMenuLibrary();
    if (!Array.isArray(library)) library = [];
}

function createSuggestionBox(input) {
    let box = input._autocompleteBox;
    if (box) return box;

    box = document.createElement("div");
    box.className = "autocomplete-list";

    // menu-item이 flex 레이아웃이므로 목록을 input의 자식으로 넣지 않습니다.
    // body에 fixed로 붙여야 모바일에서 세로 글자/폭 깨짐과 overflow clipping을 피할 수 있습니다.
    Object.assign(box.style, {
        position: "fixed",
        display: "none",
        zIndex: "99999",
        background: "#ffffff",
        border: "1px solid #cfd6df",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,.16)",
        overflowY: "auto",
        maxHeight: "280px",
        padding: "4px 0",
        boxSizing: "border-box",
        textAlign: "left",
        writingMode: "horizontal-tb"
    });

    document.body.appendChild(box);
    input._autocompleteBox = box;
    return box;
}

function positionSuggestionBox(input, box) {
    if (!input || !box) return;

    const rect = input.getBoundingClientRect();
    const gap = 4;
    const maxWidth = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - maxWidth - 8));

    box.style.left = `${left}px`;
    box.style.width = `${maxWidth}px`;

    // 아래 공간이 부족하면 입력창 위에 표시합니다.
    const boxHeight = Math.min(box.scrollHeight || 280, 280);
    const below = window.innerHeight - rect.bottom - gap;
    const top = below >= Math.min(boxHeight, 180)
        ? rect.bottom + gap
        : Math.max(8, rect.top - boxHeight - gap);

    box.style.top = `${top}px`;
}

function closeSuggestion(box) {
    if (!box) return;
    box.innerHTML = "";
    box.style.display = "none";
    selectedIndex = -1;
    if (activeBox === box) {
        activeBox = null;
        activeInput = null;
    }
}

function makeSuggestionItem(input, box, item) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "autocomplete-item";
    row.textContent = item.name;

    Object.assign(row.style, {
        display: "block",
        width: "100%",
        minHeight: "44px",
        margin: "0",
        padding: "9px 14px",
        border: "0",
        borderRadius: "0",
        background: "#ffffff",
        color: "#222222",
        font: "inherit",
        fontSize: "16px",
        lineHeight: "1.4",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        writingMode: "horizontal-tb",
        cursor: "pointer",
        boxSizing: "border-box"
    });

    row.addEventListener("mouseenter", () => {
        row.style.background = "#eef5ff";
    });

    row.addEventListener("mouseleave", () => {
        if (!row.classList.contains("selected")) row.style.background = "#ffffff";
    });

    row.addEventListener("mousedown", event => {
        event.preventDefault();
        input.value = item.name;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        closeSuggestion(box);
        input.focus();
    });

    return row;
}

function renderSuggestion(input, box, keyword) {
    box.innerHTML = "";
    selectedIndex = -1;

    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
        closeSuggestion(box);
        return;
    }

    const result = library
        .filter(item => item && typeof item.name === "string")
        .filter(item => item.name.toLowerCase().includes(normalized))
        .slice(0, 10);

    if (!result.length) {
        closeSuggestion(box);
        return;
    }

    result.forEach(item => box.appendChild(makeSuggestionItem(input, box, item)));

    activeBox = box;
    activeInput = input;
    box.style.display = "block";
    positionSuggestionBox(input, box);
}

function moveSelection(box, direction) {
    const items = [...box.querySelectorAll(".autocomplete-item")];
    if (!items.length) return;

    selectedIndex += direction;
    if (selectedIndex < 0) selectedIndex = items.length - 1;
    if (selectedIndex >= items.length) selectedIndex = 0;

    items.forEach((item, index) => {
        const selected = index === selectedIndex;
        item.classList.toggle("selected", selected);
        item.style.background = selected ? "#eef5ff" : "#ffffff";
    });

    items[selectedIndex].scrollIntoView({ block: "nearest" });
}

function selectCurrent(input, box) {
    const items = [...box.querySelectorAll(".autocomplete-item")];
    if (selectedIndex >= 0 && items[selectedIndex]) {
        input.value = items[selectedIndex].textContent;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeSuggestion(box);
}

export function attachAutocomplete(input) {
    if (!input || input.dataset.autocompleteAttached === "true") return;

    input.dataset.autocompleteAttached = "true";
    const box = createSuggestionBox(input);

    input.addEventListener("input", () => {
        renderSuggestion(input, box, input.value);
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) renderSuggestion(input, box, input.value);
    });

    input.addEventListener("keydown", event => {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveSelection(box, 1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveSelection(box, -1);
                break;
            case "Enter":
                if (selectedIndex >= 0) {
                    event.preventDefault();
                    selectCurrent(input, box);
                }
                break;
            case "Escape":
                closeSuggestion(box);
                break;
        }
    });

    input.addEventListener("blur", () => {
        setTimeout(() => closeSuggestion(box), 150);
    });
}

function repositionActiveSuggestion() {
    if (activeBox && activeInput && activeBox.style.display !== "none") {
        positionSuggestionBox(activeInput, activeBox);
    }
}

window.addEventListener("resize", repositionActiveSuggestion, { passive: true });
window.addEventListener("scroll", repositionActiveSuggestion, { passive: true, capture: true });

export async function refreshAutocomplete() {
    await loadAutocomplete();
}

export default {
    loadAutocomplete,
    refreshAutocomplete,
    attachAutocomplete
};
