// ============================================
// Happy Buffet Display
// Admin v4.5.0
// autocomplete.js
// ============================================

import {

    getMenuLibrary

} from "../firebase/firestore.js";

/* ============================================
   State
============================================ */

let library = [];

let selectedIndex = -1;

/* ============================================
   Load
============================================ */

export async function loadAutocomplete() {

    library = await getMenuLibrary();

}

/* ============================================
   Suggestion Box
============================================ */

function createSuggestionBox(input) {

    const parent = input.parentElement;

    if (!parent) {
        console.warn("Autocomplete: input이 아직 DOM에 연결되지 않았습니다.");
        return null;
    }

    let box = parent.querySelector(".autocomplete-list");

    if (box) return box;

    box = document.createElement("div");
    box.className = "autocomplete-list";

    parent.style.position = "relative";
    parent.appendChild(box);

    return box;
}

/* ============================================
   Close
============================================ */

function closeSuggestion(box) {

    if (!box) return;

    box.innerHTML = "";

    box.style.display = "none";

    selectedIndex = -1;

}

/* ============================================
   Render
============================================ */

function renderSuggestion(

    input,

    box,

    keyword

) {

    box.innerHTML = "";

    selectedIndex = -1;

    keyword = keyword.trim().toLowerCase();

    if (!keyword) {

        closeSuggestion(box);

        return;

    }

    const result = library

        .filter(item =>

            item.name

                .toLowerCase()

                .includes(keyword)

        )

        .slice(0, 10);

    if (result.length === 0) {

        closeSuggestion(box);

        return;

    }

    result.forEach(item => {

        const row = document.createElement("div");

        row.className = "autocomplete-item";

        row.textContent = item.name;

        row.addEventListener(

            "mousedown",

            () => {

                input.value = item.name;

                input.dispatchEvent(

                    new Event("change")

                );

                closeSuggestion(box);

            }

        );

        box.appendChild(row);

    });

    box.style.display = "block";

}

/* ============================================
   Keyboard
============================================ */

function moveSelection(

    box,

    direction

) {

    const items = box.querySelectorAll(

        ".autocomplete-item"

    );

    if (items.length === 0) return;

    selectedIndex += direction;

    if (selectedIndex < 0) {

        selectedIndex = items.length - 1;

    }

    if (selectedIndex >= items.length) {

        selectedIndex = 0;

    }

    items.forEach(item =>

        item.classList.remove(

            "selected"

        )

    );

    items[selectedIndex].classList.add(

        "selected"

    );

}

function selectCurrent(

    input,

    box

) {

    const items = box.querySelectorAll(

        ".autocomplete-item"

    );

    if (

        selectedIndex >= 0 &&

        items[selectedIndex]

    ) {

        input.value =

            items[selectedIndex].textContent;

        input.dispatchEvent(

            new Event("change")

        );

    }

    closeSuggestion(box);

}

/* ============================================
   Attach
============================================ */

export function attachAutocomplete(input) {

    const box = createSuggestionBox(input);

    if (!box) return;

    input.addEventListener(

        "input",

        () => {

            renderSuggestion(

                input,

                box,

                input.value

            );

        }

    );

    input.addEventListener(

        "keydown",

        event => {

            switch (event.key) {

                case "ArrowDown":

                    event.preventDefault();

                    moveSelection(

                        box,

                        1

                    );

                    break;

                case "ArrowUp":

                    event.preventDefault();

                    moveSelection(

                        box,

                        -1

                    );

                    break;

                case "Enter":

                    if (selectedIndex >= 0) {

                        event.preventDefault();

                        selectCurrent(

                            input,

                            box

                        );

                    }

                    break;

                case "Escape":

                    closeSuggestion(box);

                    break;

            }

        }

    );

    input.addEventListener(

        "blur",

        () => {

            setTimeout(

                () => {

                    closeSuggestion(box);

                },

                150

            );

        }

    );

}

/* ============================================
   Refresh
============================================ */

export async function refreshAutocomplete() {

    await loadAutocomplete();

}

/* ============================================
   Export
============================================ */

export default {

    loadAutocomplete,

    refreshAutocomplete,

    attachAutocomplete

};