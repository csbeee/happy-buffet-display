import { db } from "../firebase/firestore.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

/* =========================
   📌 상태값
========================= */

let selectedDate = getTodayKey();

let currentMenu = {
  soup: [],
  main: [],
  side: [],
  kimchi: [],
  dessert: []
};

/* =========================
   📌 날짜 키 생성
========================= */

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/* =========================
   📌 메뉴 라이브러리 로드
========================= */

onSnapshot(collection(db, "menus"), (snap) => {
  const list = document.getElementById("menuList");
  list.innerHTML = "";

  snap.forEach(docSnap => {
    const menu = docSnap.data();

    const div = document.createElement("div");
    div.className = "menu-item";
    div.textContent = `${menu.name} (${menu.category})`;

    // 클릭 → 추가
    div.onclick = () => addToMenu(menu.category, menu.name);

    list.appendChild(div);
  });
});

/* =========================
   📌 메뉴 추가
========================= */

window.addToMenu = function(category, name) {

  if (!currentMenu[category]) return;

  currentMenu[category].push(name);

  renderCurrentMenu();
};

/* =========================
   📌 화면 렌더링
========================= */

function renderCurrentMenu() {

  ["soup","main","side","kimchi","dessert"].forEach(cat => {

    const ul = document.getElementById(cat);
    if (!ul) return;

    ul.innerHTML = "";

    currentMenu[cat].forEach((item, index) => {

      const li = document.createElement("li");
      li.textContent = item;

      /* -------------------------
         🧲 드래그 시작
      ------------------------- */
      li.draggable = true;

      li.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          category: cat,
          index
        }));
      };

      /* -------------------------
         🧲 삭제 (더블클릭)
      ------------------------- */
      li.ondblclick = () => {
        currentMenu[cat].splice(index, 1);
        renderCurrentMenu();
      };

      ul.appendChild(li);
    });

    /* -------------------------
       🧲 드롭 허용
    ------------------------- */
    ul.ondragover = (e) => e.preventDefault();

    ul.ondrop = (e) => {
      e.preventDefault();

      const data = JSON.parse(e.dataTransfer.getData("text/plain"));

      const moved = currentMenu[data.category].splice(data.index, 1)[0];

      currentMenu[cat].push(moved);

      renderCurrentMenu();
    };
  });
}

/* =========================
   📌 날짜 변경
========================= */

window.setDate = function(date) {
  selectedDate = date;
  loadMenu(date);
};

/* =========================
   📌 기존 데이터 로드
========================= */

async function loadMenu(date) {

  const snap = await getDoc(doc(db, "todayMenu", date));

  if (snap.exists()) {
    currentMenu = snap.data();
  } else {
    currentMenu = {
      soup: [],
      main: [],
      side: [],
      kimchi: [],
      dessert: []
    };
  }

  renderCurrentMenu();
}

/* =========================
   📌 저장
========================= */

window.saveMenu = async function() {

  await setDoc(doc(db, "todayMenu", selectedDate), {
    ...currentMenu,
    notice: document.getElementById("notice")?.value || "",
    updatedAt: new Date()
  });

  alert("저장 완료");
};

/* =========================
   📌 초기 로딩
========================= */

loadMenu(selectedDate);