// ============================================
// Happy Buffet Display
// Version : v4.5.1
// File : admin/library-editor.js
// ============================================

import {

    addLibraryMenu,

    updateLibraryMenu,

    deleteLibraryMenu,

    existsMenu

} from "../firebase/firestore.js";


/* ============================================
   State
============================================ */

let currentId = null;

/* ============================================
   DOM
============================================ */

const modal = document.getElementById("editorModal");

const title = document.getElementById("editorTitle");

const nameInput = document.getElementById("menuName");

const categoryInput = document.getElementById("menuCategory");

const costInput = document.getElementById("menuCost");

const meatInput = document.getElementById("menuMeat");

const enabledInput = document.getElementById("menuEnabled");

const favoriteInput = document.getElementById("menuFavorite");

const saveBtn = document.getElementById("editorSave");

const deleteBtn = document.getElementById("editorDelete");

const cancelBtn = document.getElementById("editorCancel");

/* ============================================
   Open
============================================ */

export function openEditor(menu = null) {

    currentId = menu?.id ?? null;

    if (menu) {

        title.textContent = "메뉴 수정";

        nameInput.value = menu.name;

        categoryInput.value = menu.category;

        costInput.value = menu.costLevel;

        meatInput.value = menu.meat;

        enabledInput.checked = menu.enabled;

        favoriteInput.checked = menu.favorite;

        deleteBtn.style.display = "";

    } else {

        title.textContent = "메뉴 추가";

        nameInput.value = "";

        categoryInput.value = "main";

        costInput.value = "medium";

        meatInput.value = "none";

        enabledInput.checked = true;

        favoriteInput.checked = false;

        deleteBtn.style.display = "none";

    }

    modal.classList.add("show");

}

/* ============================================
   Close
============================================ */

export function closeEditor() {

    modal.classList.remove("show");

}

/* ============================================
   Save
============================================ */

async function saveMenu() {

    const name = nameInput.value.trim();

    if (!name) {

        alert("메뉴명을 입력하세요.");

        nameInput.focus();

        return;

    }

    const menu = {

        name,

        category: categoryInput.value,

        costLevel: costInput.value,

        meat: meatInput.value,

        enabled: enabledInput.checked,

        favorite: favoriteInput.checked

    };

    try {

        if (currentId) {

            await updateLibraryMenu(

                currentId,

                menu

            );

        } else {

            const exists = await existsMenu(name, currentId);

            if (exists) {

                alert("이미 등록된 메뉴입니다.");

                return;

            }

            await addLibraryMenu(menu);

        }
        
        alert(

            currentId

                ? "메뉴가 수정되었습니다."

                : "메뉴가 추가되었습니다."

        );



        closeEditor();

        window.dispatchEvent(

            new Event(

                "libraryChanged"

            )

        );

    }

    catch (error) {

        console.error(error);

        alert("저장 실패");

    }

}

/* ============================================
   Delete
============================================ */

async function removeMenu() {

    if (!currentId) {

        return;

    }

    if (

        !confirm(

            "삭제하시겠습니까?"

        )

    ) {

        return;

    }

    try {

        await deleteLibraryMenu(

            currentId

        );

        closeEditor();

        window.dispatchEvent(

            new CustomEvent(

                "libraryChanged"

            )

        );

    }

    catch (error) {

        console.error(error);

        alert("삭제 실패");

    }

}

/* ============================================
   Event
============================================ */

function bindEvents() {

    saveBtn.addEventListener(

        "click",

        saveMenu

    );

    deleteBtn.addEventListener(

        "click",

        removeMenu

    );

    cancelBtn.addEventListener(

        "click",

        closeEditor

    );

    modal.addEventListener(

        "click",

        (e) => {

            if (e.target === modal) {

                closeEditor();

            }

        }

    );

    document.addEventListener(

        "keydown",

        (e) => {

            if (

                e.key === "Escape" &&

                modal.classList.contains("show")

            ) {

                closeEditor();

            }

        }

    );

}

/* ============================================
   Initialize
============================================ */

export function initLibraryEditor() {

    bindEvents();

}