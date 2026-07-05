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

}

function addItem(parent, value) {

    const row = document.createElement("div");

    row.className = "menu-item";

    row.innerHTML = `
        <input value="${value}">
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