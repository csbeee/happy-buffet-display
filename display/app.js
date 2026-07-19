import {
    watchTodayMenu
} from "../firebase/firestore.js";

import {
    getMenuIcon
} from "../shared/icon-map.js";

/* ============================================
                날짜 / 시간
============================================ */

function updateClock() {

    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit"
        });

    document.getElementById("date").textContent =
        now.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short"
        });

}

updateClock();

setInterval(updateClock, 1000);

/* ============================================
            메뉴 출력
============================================ */

function draw(category, items = []) {

    const ul = document.getElementById(category);

    if (!ul) return;

    ul.innerHTML = "";

    //------------------------------------
    // 레이아웃 초기화
    //------------------------------------

    ul.classList.remove("two-column");

    ul.classList.remove("small-text");

    ul.classList.remove("large-text");

    //------------------------------------
    // 반찬 자동 2열
    //------------------------------------

    if(category==="side"){

    if(items.length>=6){

        ul.classList.add("two-column");

    }

}

if(category==="main"){

    ul.classList.add("two-column");

}

    //------------------------------------
    // 글자 크기 자동 조절
    //------------------------------------

    if (items.length >= 8) {

        ul.classList.add("small-text");

    } else {

        ul.classList.add("large-text");

    }

    //------------------------------------
    // 메뉴 생성
    //------------------------------------

    items.forEach(menu => {

        const li = document.createElement("li");

        li.className = "fade";

        li.innerHTML = `

            <img
                class="menu-icon"
                src="${getMenuIcon(menu)}"
                alt="">

            <span class="title">

                ${menu}

            </span>

        `;

        ul.appendChild(li);

    });

}

/* ============================================
            카드 표시 여부
============================================ */

function toggleCard(id, items) {

    const card = document.getElementById(id);

    if (!card) return;

    if (!items || items.length === 0) {

        card.classList.add("hide");

    } else {

        card.classList.remove("hide");

    }

}

/* ============================================
            공지
============================================ */

function drawNotice(text) {
    const card = document.getElementById("noticeCard");
    const notice = document.getElementById("notice");

    // 🚨 [안전장치] 들어온 데이터가 확실한 문자열인지 검증하고 가공합니다.
    const safeText = typeof text === "string" ? text.trim() : (text ? String(text).trim() : "");

    // 가공된 문자열(safeText)이 비어있다면 공지창을 숨깁니다.
    if (safeText === "" || safeText === "undefined" || safeText === "null") {
        if (card) card.classList.add("hide");
        return;
    }

    if (card) card.classList.remove("hide");
    if (notice) notice.textContent = safeText;

    //------------------------------------
    // 공지 스크롤 재시작 (기존 멋진 로직 유지)
    //------------------------------------
    if (notice) {
        notice.classList.remove("notice-scroll");
        
        // 애니메이션 리셋을 위한 트리거
        void notice.offsetWidth; 

        // 가공된 안전한 문자열의 길이를 기준으로 속도 계산
        const duration = Math.max(12, safeText.length * 0.55);
        notice.style.animationDuration = `${duration}s`;

        notice.classList.add("notice-scroll");
    }
}

/* ============================================
            업데이트 시간
============================================ */

function drawUpdatedTime(updatedAt) {

    if (!updatedAt) return;

    const date = updatedAt.toDate();

    document.getElementById("updatedAt").textContent =

        "마지막 저장 : " +

        date.toLocaleString("ko-KR");

}

/* ============================================
            Firestore
============================================ */

watchTodayMenu(menu => {

    if (!menu) return;

    draw("soup", menu.soup || []);
    toggleCard("card-soup", menu.soup);

    draw("main", menu.main || []);
    toggleCard("card-main", menu.main);

    draw("side", menu.side || []);
    toggleCard("card-side", menu.side);

    draw("kimchi", menu.kimchi || []);
    toggleCard("card-kimchi", menu.kimchi);

    draw("dessert", menu.dessert || []);
    toggleCard("card-dessert", menu.dessert);

    drawNotice(menu.notice || "");

    drawUpdatedTime(menu.updatedAt);

});

