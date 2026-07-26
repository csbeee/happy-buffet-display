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

    const clock = document.getElementById("clock");
    const date = document.getElementById("date");

    if (clock) {
        clock.textContent =
            now.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit"
            });
    }

    if (date) {
        date.textContent =
            now.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short"
            });
    }

}

updateClock();

setInterval(updateClock, 1000);


/* ============================================
            일반 메뉴 출력
============================================ */

function draw(category, items = []) {

    const ul = document.getElementById(category);

    if (!ul) {
        return;
    }

    ul.innerHTML = "";

    /* ----------------------------------------
       레이아웃 초기화
    ---------------------------------------- */

    ul.classList.remove("two-column");
    ul.classList.remove("small-text");
    ul.classList.remove("large-text");


    /* ----------------------------------------
       메인 메뉴
       항상 2열
    ---------------------------------------- */

    if (category === "main") {

        if (items.length >= 2) {
            ul.classList.add("two-column");
        }

    }


    /* ----------------------------------------
       반찬
       6개 이상이면 2열
    ---------------------------------------- */

    if (category === "side") {

        if (items.length >= 6) {
            ul.classList.add("two-column");
        }

    }


    /* ----------------------------------------
       글자 크기 자동 조절
    ---------------------------------------- */

    if (items.length >= 8) {

        ul.classList.add("small-text");

    } else {

        ul.classList.add("large-text");

    }


    /* ----------------------------------------
       메뉴 생성
    ---------------------------------------- */

    items.forEach(menu => {

        const li = document.createElement("li");

        li.className = "fade";


        const img = document.createElement("img");

        img.className = "menu-icon";

        img.src = getMenuIcon(menu);

        img.alt = "";


        const title = document.createElement("span");

        title.className = "title";

        title.textContent = menu;


        li.appendChild(img);

        li.appendChild(title);

        ul.appendChild(li);

    });

}


/* ============================================
            카드 표시 여부
============================================ */

function toggleCard(id, items) {

    const card = document.getElementById(id);

    if (!card) {
        return;
    }

    const hasItems =
        Array.isArray(items) &&
        items.length > 0;


    if (hasItems) {

        card.classList.remove("hide");

    } else {

        card.classList.add("hide");

    }

}


/* ============================================
            공지사항 출력
============================================ */

function drawNotice(text) {

    const card =
        document.getElementById("noticeCard");

    const notice =
        document.getElementById("notice");


    const safeText =
        typeof text === "string"
            ? text.trim()
            : text
                ? String(text).trim()
                : "";


    /* ----------------------------------------
       공지 없음
    ---------------------------------------- */

    if (
        safeText === "" ||
        safeText === "undefined" ||
        safeText === "null"
    ) {

        if (card) {
            card.classList.add("hide");
        }

        if (notice) {
            notice.textContent = "";
            notice.classList.remove("notice-scroll");
        }

        return;

    }


    /* ----------------------------------------
       공지 표시
    ---------------------------------------- */

    if (card) {
        card.classList.remove("hide");
    }

    if (!notice) {
        return;
    }


    notice.textContent = safeText;


    /* ----------------------------------------
       기존 애니메이션 초기화
    ---------------------------------------- */

    notice.classList.remove(
        "notice-scroll"
    );


    /* ----------------------------------------
       애니메이션 강제 재시작
    ---------------------------------------- */

    void notice.offsetWidth;


    /* ----------------------------------------
       문자열 길이에 따른 속도 계산
    ---------------------------------------- */

    const duration =
        Math.max(
            12,
            safeText.length * 0.55
        );


    notice.style.animationDuration =
        `${duration}s`;


    notice.classList.add(
        "notice-scroll"
    );

}


/* ============================================
            업데이트 시간
============================================ */

function drawUpdatedTime(updatedAt) {

    const target =
        document.getElementById("updatedAt");

    if (!target) {
        return;
    }


    if (!updatedAt) {

        target.textContent =
            "마지막 저장 : -";

        return;

    }


    try {

        const date =
            updatedAt.toDate();

        target.textContent =
            "마지막 저장 : " +
            date.toLocaleString("ko-KR");

    } catch (error) {

        console.warn(
            "updatedAt 변환 실패:",
            error
        );

    }

}


/* ============================================
            일반 메뉴 렌더링
============================================ */

function renderNormal(menu) {

    if (!menu) {
        return;
    }


    /* ----------------------------------------
       메뉴 데이터
    ---------------------------------------- */

    const soup =
        Array.isArray(menu.soup)
            ? menu.soup
            : [];


    const main =
        Array.isArray(menu.main)
            ? menu.main
            : [];


    const side =
        Array.isArray(menu.side)
            ? menu.side
            : [];


    const kimchi =
        Array.isArray(menu.kimchi)
            ? menu.kimchi
            : [];


    const dessert =
        Array.isArray(menu.dessert)
            ? menu.dessert
            : [];


    /* ----------------------------------------
       메뉴 출력
    ---------------------------------------- */

    draw(
        "soup",
        soup
    );


    draw(
        "main",
        main
    );


    draw(
        "side",
        side
    );


    draw(
        "kimchi",
        kimchi
    );


    draw(
        "dessert",
        dessert
    );


    /* ----------------------------------------
       카드 표시 / 숨김
    ---------------------------------------- */

    toggleCard(
        "card-soup",
        soup
    );


    toggleCard(
        "card-main",
        main
    );


    toggleCard(
        "card-side",
        side
    );


    toggleCard(
        "card-kimchi",
        kimchi
    );


    toggleCard(
        "card-dessert",
        dessert
    );


    /* ----------------------------------------
       공지
    ---------------------------------------- */

    drawNotice(
        menu.notice
    );


    /* ----------------------------------------
       저장 시간
    ---------------------------------------- */

    drawUpdatedTime(
        menu.updatedAt
    );

}


/* ============================================
            컨셉데이 테마
============================================ */

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

        },


        custom: {

            title: "Today's Special",

            icon: "🍽",

            color: "#1976D2"

        }

    };


    return (
        themes[theme] ||
        themes.custom
    );

}


/* ============================================
            컨셉데이 출력
============================================ */

function renderSpecial(menu) {

    const concept =
        menu.concept || {};


    /* ----------------------------------------
       Theme
    ---------------------------------------- */

    const theme =
        getConceptTheme(
            concept.theme
        );


    /* ----------------------------------------
       Icon
    ---------------------------------------- */

    const icon =
        document.getElementById(
            "specialIcon"
        );


    if (icon) {

        icon.textContent =
            concept.icon ||
            theme.icon;

    }


    /* ----------------------------------------
       Title
    ---------------------------------------- */

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


    /* ----------------------------------------
       Subtitle
    ---------------------------------------- */

    const subtitle =
        document.getElementById(
            "specialSubtitle"
        );


    if (subtitle) {

        subtitle.textContent =
            concept.subtitle || "";

    }


    /* ----------------------------------------
       Theme Color
    ---------------------------------------- */

    document.documentElement.style.setProperty(

        "--special-color",

        theme.color

    );


    /* ----------------------------------------
       Section Container
    ---------------------------------------- */

    const sections =
        document.getElementById(
            "specialSections"
        );


    if (!sections) {
        return;
    }


    sections.innerHTML = "";


    /* ----------------------------------------
       Section 데이터 검증
    ---------------------------------------- */

    if (
        !Array.isArray(
            menu.sections
        )
    ) {

        return;

    }


    /* ----------------------------------------
       Section 출력
    ---------------------------------------- */

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
            Display Layout 전환
============================================ */

function setDisplayMode(mode) {

    const normalLayout =
        document.getElementById(
            "normalLayout"
        );


    const specialLayout =
        document.getElementById(
            "specialLayout"
        );


    if (
        !normalLayout ||
        !specialLayout
    ) {

        console.warn(
            "Display Layout 요소를 찾을 수 없습니다."
        );

        return;

    }


    if (mode === "special") {

        /* 컨셉데이 */

        normalLayout.classList.add(
            "hide"
        );


        specialLayout.classList.remove(
            "hide"
        );

    } else {

        /* 일반 메뉴 */

        normalLayout.classList.remove(
            "hide"
        );


        specialLayout.classList.add(
            "hide"
        );

    }

}


/* ============================================
            Today Menu 렌더링
============================================ */

function renderToday(menu) {

    if (!menu) {
        return;
    }


    const mode =
        menu.displayMode === "special"
            ? "special"
            : "normal";


    /* ----------------------------------------
       Display Mode 전환
    ---------------------------------------- */

    setDisplayMode(
        mode
    );


    /* ----------------------------------------
       일반 메뉴
    ---------------------------------------- */

    if (mode === "normal") {

        renderNormal(
            menu
        );

        return;

    }


    /* ----------------------------------------
       컨셉데이
    ---------------------------------------- */

    renderSpecial(
        menu
    );

}


/* ============================================
            Firestore 실시간 감시
============================================ */

watchTodayMenu(
    menu => {

        if (!menu) {

            console.warn(
                "Today Menu 데이터가 없습니다."
            );

            return;

        }


        console.log(
            "Display Today Menu:",
            menu
        );


        renderToday(
            menu
        );

    }
);