import * as schema from "../shared/menu-schema.js";

console.log(schema);

import { MENU_SCHEMA } from "../shared/menu-schema.js";

export function renderMenu(menu) {

    const app = document.getElementById("app");
    app.innerHTML = "";

    MENU_SCHEMA.forEach(category => {

        const box = document.createElement("div");
        box.className = "category";

        box.innerHTML = `
            <h2>
                ${category.title}
                <button class="add-btn">+ 추가</button>
            </h2>

            <div class="items"></div>
        `;

        const items = box.querySelector(".items");

        (menu[category.key] || []).forEach(item => {
            addRow(items, item);
        });

        box.querySelector(".add-btn").onclick = () => {
            addRow(items, "");
        };

        app.appendChild(box);

    });

    createNotice(menu.notice || "");

}

function addRow(parent, value = "") {

    const row = document.createElement("div");

    row.className = "menu-item";

    row.innerHTML = `
        <input type="text" value="${value}">
        <button class="delete">삭제</button>
    `;

    row.querySelector(".delete").onclick = () => {
        row.remove();
    };

    parent.appendChild(row);

}

function createNotice(text){

    const div = document.createElement("div");

    div.className = "category";

    div.innerHTML = `
        <h2>공지사항</h2>

        <textarea id="notice"
            style="width:100%;height:120px;">${text}</textarea>
    `;

    document.getElementById("app").appendChild(div);

}



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