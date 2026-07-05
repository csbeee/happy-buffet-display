import {
    getTodayMenu,
    saveTodayMenu
} from "../firebase/firestore.js";

import {
    renderMenu,
    collectMenu
} from "./menu-ui.js";

async function init() {

    const menu = await getTodayMenu();

    if (menu) {
        renderMenu(menu);
    }

}

init();

document.getElementById("saveBtn").addEventListener("click", async () => {

    try {

        const menu = collectMenu();

        console.log("저장할 데이터", menu);

        await saveTodayMenu(menu);

        alert("저장되었습니다.");

    } catch (err) {

        console.error(err);

        alert("저장 실패");

    }

});