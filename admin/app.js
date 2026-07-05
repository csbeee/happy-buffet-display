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

        if (menu.updatedAt) {

            const date = menu.updatedAt.toDate();

            document.getElementById("saveInfo").textContent =
                "마지막 저장 : " +
                date.toLocaleString("ko-KR");
        }

    }

}

init();

const saveBtn = document.getElementById("saveBtn");

saveBtn.addEventListener("click", async () => {

    try {

        saveBtn.disabled = true;
        saveBtn.textContent = "저장 중...";

        const menu = collectMenu();

        await saveTodayMenu(menu);

        document.getElementById("saveInfo").textContent =
            "마지막 저장 : " +
            new Date().toLocaleString("ko-KR");

        toast("저장되었습니다.");

    } catch (err) {

        console.error(err);

        toast("저장 실패");

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = "저장";

    }

});

function toast(message){

    const t=document.getElementById("toast");

    t.textContent=message;

    t.classList.add("show");

    setTimeout(()=>{

        t.classList.remove("show");

    },2000);

}