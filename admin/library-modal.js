// ============================================
// Happy Buffet Display
// Version : v4.5.2 (안전성 강화 버전)
// File : admin/library-modal.js
// ============================================

import {
    getMenuLibrary,
    setFavorite,
    setEnabled
} from "../firebase/firestore.js";

import {
    openEditor,
} from "./library-editor.js";

/* ============================================
   State
============================================ */
let library = [];
let filtered = [];
let currentInput = null;
let currentCategory = "all";

/* ============================================
   DOM Elements (안전하게 함수로 취득)
============================================ */
const getElements = () => ({
    modal: document.getElementById("libraryModal"),
    list: document.getElementById("libraryList"),
    search: document.getElementById("librarySearch"),
    category: document.getElementById("libraryCategory"),
    addButton: document.getElementById("libraryAdd"),
    closeButton: document.getElementById("closeLibrary")
});

/* ============================================
   Open / Close
============================================ */
export async function openLibrary(input) {
    const els = getElements();
    currentInput = input;
    
    if (els.modal) els.modal.classList.add("show");
    if (els.search) els.search.value = "";
    
    // 모달이 열릴 때 무조건 파이어베이스 최신 데이터를 새로 긁어와서 강제 렌더링
    await loadLibrary();
}

export function closeLibrary() {
    const els = getElements();
    if (els.modal) els.modal.classList.remove("show");
}

/* ============================================
   Load Data
============================================ */
export async function loadLibrary() {
    try {
        library = await getMenuLibrary();
        filtered = [...library];
        filter(); // 데이터를 가져온 후 즉시 필터 및 렌더링 실행
    } catch (error) {
        console.error("라이브러리 로드 실패:", error);
    }
}

/* ============================================
   Filter
============================================ */
function filter() {
    const els = getElements();
    const keyword = els.search ? els.search.value.trim().toLowerCase() : "";

    filtered = library.filter(menu => {
        const categoryMatch =
            currentCategory === "all"
            || menu.category === currentCategory;

        const keywordMatch =
            menu.name
                .toLowerCase()
                .includes(keyword);

        return categoryMatch && keywordMatch;
    });

    renderList(filtered);
}

/* ============================================
   Render List
============================================ */
function renderList(data) {
    const els = getElements();
    if (!els.list) return;

    els.list.innerHTML = "";

    if (!data || data.length === 0) {
        els.list.innerHTML = `
            <div class="library-empty" style="padding: 20px; text-align: center; color: #999;">
                등록된 메뉴가 없습니다.
            </div>
        `;
        return;
    }

    data.forEach(menu => {
        const favorite = menu.favorite ?? false;
        const row = document.createElement("div");
        row.className = "library-item";
        row.innerHTML = `
            <div class="library-name">${menu.name}</div>
            <div class="library-category">${menu.category}</div>
            <div class="library-actions">
                <button class="library-use">선택</button>
                <button class="library-edit">수정</button>
                <button class="favorite-btn">${favorite ? "⭐" : "☆"}</button>
            </div>
        `;

        /* 선택 버튼 */
        row.querySelector(".library-use").addEventListener("click", () => {
            if (currentInput) {
                currentInput.value = menu.name;
                currentInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            closeLibrary();
        });

        /* 수정 버튼 */
        row.querySelector(".library-edit").addEventListener("click", () => {
            openEditor(menu);
        });

        /* 즐겨찾기 버튼 */
        row.querySelector(".favorite-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            await toggleFavorite(menu);
            await loadLibrary();
        });

        els.list.appendChild(row);
    });
}

/* ============================================
   Favorite / Enabled
============================================ */
export async function toggleFavorite(menu) {
    try {
        await setFavorite(menu.id, !menu.favorite);
        menu.favorite = !menu.favorite;
    } catch (error) {
        console.error("즐겨찾기 변경 실패", error);
    }
}

export async function toggleEnabled(menu) {
    await setEnabled(menu.id, !menu.enabled);
}

/* ============================================
   Initialize & Global Events (안전한 바인딩)
============================================ */
/* ============================================
   Initialize & Global Events (수정본)
============================================ */
export function initLibraryModal() {
    const els = getElements();
    currentCategory = "all";

    // 🚨 [핵심 수정] 관리자 페이지의 '메뉴 라이브러리' 버튼을 찾아서 클릭 이벤트를 연결합니다.
    const libraryBtn = document.getElementById("libraryBtn"); 
    if (libraryBtn) {
        libraryBtn.addEventListener("click", () => {
            // 버튼을 누르면 입력 대상을 특정할 수 없으므로 null을 넘겨 모달을 엽니다.
            openLibrary(null); 
        });
    }

    // 검색창 이벤트
    if (els.search) {
        els.search.removeEventListener("input", filter);
        els.search.addEventListener("input", filter);
    }

    // 카테고리 변경 이벤트
    if (els.category) {
        els.category.addEventListener("change", () => {
            currentCategory = els.category.value;
            filter();
        });
    }

    // 메뉴 추가 버튼 이벤트
    if (els.addButton) {
        els.addButton.addEventListener("click", () => openEditor());
    }

    // 닫기 버튼 이벤트
    if (els.closeButton) {
        els.closeButton.addEventListener("click", closeLibrary);
    }

    // 모달 바깥 영역 클릭 시 닫기
    if (els.modal) {
        els.modal.addEventListener("click", (e) => {
            if (e.target === els.modal) closeLibrary();
        });
    }
}

// ESC 키 입력 시 모달 닫기
document.addEventListener("keydown", (e) => {
    const els = getElements();
    if (e.key === "Escape" && els.modal && els.modal.classList.contains("show")) {
        closeLibrary();
    }
});

// 외부 데이터 변경 시 자동 동기화
window.addEventListener("libraryChanged", async () => {
    console.log("Library Reload");
    await loadLibrary();
});