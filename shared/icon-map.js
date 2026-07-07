const ICONS = {
    pork: "../assets/icons/meat/pork.svg",
    beef: "../assets/icons/meat/beef.svg",
    chicken: "../assets/icons/meat/chicken.svg",

    fish: "../assets/icons/seafood/fish.svg",
    squid: "../assets/icons/seafood/squid.svg",
    shrimp: "../assets/icons/seafood/shrimp.svg",

    vegetable: "../assets/icons/vegetable/vegetable.svg",
    tofu: "../assets/icons/vegetable/tofu.svg",
    egg: "../assets/icons/vegetable/egg.svg",

    default: "../assets/icons/default/food.svg"
};

export function getMenuIcon(menu) {

    const text = menu.toLowerCase();

    if (text.includes("제육") || text.includes("돈까스") || text.includes("돼지")) {
        return ICONS.pork;
    }

    if (text.includes("불고기") || text.includes("소")) {
        return ICONS.beef;
    }

    if (text.includes("닭")) {
        return ICONS.chicken;
    }

     if (text.includes("치킨")) {
        return ICONS.chicken;
    }

    if (
        text.includes("고등어") ||
        text.includes("갈치") ||
        text.includes("삼치") ||
        text.includes("생선")
    ) {
        return ICONS.fish;
    }

    if (text.includes("오징어")) {
        return ICONS.squid;
    }

    if (text.includes("새우")) {
        return ICONS.shrimp;
    }

    if (text.includes("두부")) {
        return ICONS.tofu;
    }

    if (text.includes("계란") || text.includes("달걀")) {
        return ICONS.egg;
    }

    if (
        text.includes("나물") ||
        text.includes("시금치") ||
        text.includes("콩나물")
    ) {
        return ICONS.vegetable;
    }
    // 채소
if (
    text.includes("나물") ||
    text.includes("시금치") ||
    text.includes("콩나물") ||
    text.includes("버섯") ||
    text.includes("오이") ||
    text.includes("샐러드") ||
    text.includes("토마토") ||
    text.includes("상추") ||
    text.includes("배추")
) {
    return ICONS.vegetable;
}

// 감자
if (text.includes("감자")) {
    return "../assets/icons/vegetable/potato.svg";
}

// 당근
if (text.includes("당근")) {
    return "../assets/icons/vegetable/carrot.svg";
}

// 과일
if (
    text.includes("수박") ||
    text.includes("토마토") ||
    text.includes("사과") ||
    text.includes("바나나")
) {
    return "../assets/icons/default/fruit.svg";
}

// 음료
if (
    text.includes("매실") ||
    text.includes("식혜") ||
    text.includes("차")
) {
    return "../assets/icons/default/drink.svg";
}

    return ICONS.default;
}