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

    if (category === "side") {

        if (items.length >= 6) {

            ul.classList.add("two-column");

        }

    }

    if (category === "main") {

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
           Display Mode
============================================ */
/* ============================================
           Display Mode
============================================ */

function renderToday(menu) {

    const normalLayout =
        document.getElementById(
            "normalLayout"
        );

    const specialLayout =
        document.getElementById(
            "specialLayout"
        );


    /* ========================================
       일반 메뉴 모드
    ======================================== */

    if (
        menu.displayMode !== "special"
    ) {

        // 일반 메뉴 표시
        if (normalLayout) {

            normalLayout.classList.remove(
                "hide"
            );

        }

        // 컨셉데이 숨김
        if (specialLayout) {

            specialLayout.classList.add(
                "hide"
            );

        }


        // 일반 메뉴 출력
        renderNormal(menu);

        return;

    }


    /* ========================================
       컨셉데이 모드
    ======================================== */

    // 일반 메뉴 숨김
    if (normalLayout) {

        normalLayout.classList.add(
            "hide"
        );

    }

    // 컨셉데이 표시
    if (specialLayout) {

        specialLayout.classList.remove(
            "hide"
        );

    }


    // 컨셉데이 출력
    renderSpecial(menu);

}


/* ============================================
Get Concept Theme
============================================ */

function getConceptTheme(themeKey) {

    return (

        CONCEPT_THEMES[themeKey]

        ||

        CONCEPT_THEMES.custom

    );

}



function renderSpecial(menu) {

    const concept =
        menu.concept || {};

    /* ========================================
       Theme
    ======================================== */

    const theme =
        getConceptTheme(
            concept.theme
        );


    /* ========================================
       Icon
    ======================================== */

    const icon =
        document.getElementById(
            "specialIcon"
        );

    if (icon) {

        icon.textContent =
            concept.icon ||
            theme.icon;

    }


    /* ========================================
       Title
    ======================================== */

    const title =
        document.getElementById(
            "specialTitle"
        );

    if (title) {

        title.textContent =
            concept.title ||
            theme.title ||
            "Special Day";

    }


    /* ========================================
       Subtitle
    ======================================== */

    const subtitle =
        document.getElementById(
            "specialSubtitle"
        );

    if (subtitle) {

        subtitle.textContent =
            concept.subtitle || "";

    }


    /* ========================================
       Theme Color
    ======================================== */

    document.documentElement.style.setProperty(

        "--special-color",

        theme.color

    );


    /* ========================================
       Section Container
    ======================================== */

    const sections =
        document.getElementById(
            "specialSections"
        );

    if (!sections) {

        return;

    }

    sections.innerHTML = "";


    /* ========================================
       Section Data Validation
    ======================================== */

    if (
        !Array.isArray(
            menu.sections
        )
    ) {

        return;

    }


    /* ========================================
       Render Sections
    ======================================== */

    menu.sections.forEach(

        section => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "special-section";


            const sectionTitle =
                document.createElement(
                    "h2"
                );

            sectionTitle.textContent =
                section.title || "";


            const list =
                document.createElement(
                    "ul"
                );


            const items =
                Array.isArray(
                    section.items
                )
                    ? section.items
                    : [];


            items.forEach(

                item => {

                    const li =
                        document.createElement(
                            "li"
                        );

                    li.textContent =
                        item;

                    list.appendChild(
                        li
                    );

                }

            );


            card.appendChild(
                sectionTitle
            );

            card.appendChild(
                list
            );


            sections.appendChild(
                card
            );

        }

    );

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

    renderToday(menu);

});


function getConceptTheme(theme) {

    const themes = {

        bibimbap: {

            title: "비빔밥 DAY",

            icon: "🍚",

            color: "#D84315"

        },

        bunsik: {

            title: "분식 DAY",

            icon: "🍢",

            color: "#E91E63"

        },

        samgyeopsal: {

            title: "삼겹살 DAY",

            icon: "🥩",

            color: "#8D6E63"

        },

        chinese: {

            title: "중식 DAY",

            icon: "🥟",

            color: "#E53935"

        },

        western: {

            title: "양식 DAY",

            icon: "🍝",

            color: "#3949AB"

        },

        healthy: {

            title: "건강식 DAY",

            icon: "🥗",

            color: "#43A047"

        }

    };

    return themes[theme] || {

        title: "Today's Special",

        icon: "🍽",

        color: "#1976D2"

    };

}

getConceptTheme




/* ============================================
   Display Layout 전환
============================================ */

function setDisplayMode(mode) {

    const normalLayout =
        document.getElementById("normalLayout");

    const specialLayout =
        document.getElementById("specialLayout");

    if (!normalLayout || !specialLayout) {
        return;
    }

    if (mode === "special") {

        normalLayout.classList.add("hide");

        specialLayout.classList.remove("hide");

    } else {

        normalLayout.classList.remove("hide");

        specialLayout.classList.add("hide");

    }

}
