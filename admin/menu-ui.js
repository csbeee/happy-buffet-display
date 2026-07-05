import { MENU_SCHEMA } from "../shared/menu-schema.js";
import { MENU_LIBRARY } from "../shared/menu-library.js";

const CATEGORY_MAP = {
    soup: "국",
    main: "메인요리",
    side: "서브메뉴",
    kimchi: "김치",
    extra: "추가반찬",
    dessert: "후식"
};

export function renderMenu(menu) {

    const app = document.getElementById("app");

    app.innerHTML = "";

    Object.keys(CATEGORY_MAP).forEach(key => {

        const box = document.createElement("div");
        box.className = "category";

        box.innerHTML = `
            <h2>
                ${CATEGORY_MAP[key]}
                <button class="add-btn">+ 추가</button>
            </h2>

            <div class="items"></div>
        `;

        const items = box.querySelector(".items");

        (menu[key] || []).forEach(text => {
            addItem(items, text);
        });

        box.querySelector(".add-btn").onclick = () => {
            addItem(items, "");
        };

        app.appendChild(box);

    });

    createNotice(menu.notice || "");
    createDataList();

}

function addItem(parent, value) {

    const row = document.createElement("div");

    row.className = "menu-item";

    row.innerHTML = `
        <input type="text" value="${value}" list="menuList">
        <button class="delete">삭제</button>
    `;

    row.querySelector(".delete").onclick = () => row.remove();

    parent.appendChild(row);

}

function createNotice(text){

    const div=document.createElement("div");

    div.className="category";

    div.innerHTML=`

        <h2>공지사항</h2>

        <textarea id="notice"
        style="width:100%;height:90px;font-size:18px">${text}</textarea>

    `;

    document.getElementById("app").appendChild(div);

}

function createDataList(){

    if(document.getElementById("menuList")) return;

    const dl=document.createElement("datalist");

    dl.id="menuList";

    const menus=[];

    Object.values(MENU_LIBRARY).forEach(arr=>{

        arr.forEach(menu=>menus.push(menu));

    });

    menus.sort();

    menus.forEach(menu=>{

        const option=document.createElement("option");

        option.value=menu;

        dl.appendChild(option);

    });

    document.body.appendChild(dl);

}

// ... 기존 코드 ...

export function collectMenu() {

    const result = {};

    const categoryBoxes = document.querySelectorAll(".category");

    MENU_SCHEMA.forEach((category, index) => {

        const box = categoryBoxes[index];

        const values = [];

        box.querySelectorAll("input").forEach(input => {

            const text = input.value.trim();

            if (text !== "") {
                values.push(text);
            }

        });

        result[category.key] = values;

    });

    result.notice = document.getElementById("notice").value.trim();

    return result;

}