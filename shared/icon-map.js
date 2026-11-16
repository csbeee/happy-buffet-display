const MENU_EMOJIS = {
    pork: "🥩",
    beef: "🍖",
    chicken: "🍗",
    fish: "🐟",
    squid: "🦑",
    shrimp: "🍤",
    tofu: "🧈",
    egg: "🍳",
    vegetable: "🥬",
    potato: "🥔",
    carrot: "🥕",
    fruit: "🍎",
    drink: "🥤",
    rice: "🍚",
    noodle: "🍜",
    soup: "🍲",
    default: "🍽️"
};

export function getMenuIcon(menu) {
    const text = String(menu ?? "").toLowerCase();

    if (text.includes("제육") || text.includes("돈까스") || text.includes("돼지") || text.includes("삼겹")) return MENU_EMOJIS.pork;
    if (text.includes("불고기") || text.includes("소고기") || text.includes("갈비")) return MENU_EMOJIS.beef;
    if (text.includes("닭") || text.includes("치킨")) return MENU_EMOJIS.chicken;

    if (text.includes("고등어") || text.includes("갈치") || text.includes("삼치") || text.includes("생선") || text.includes("생선까스")) return MENU_EMOJIS.fish;
    if (text.includes("오징어")) return MENU_EMOJIS.squid;
    if (text.includes("새우")) return MENU_EMOJIS.shrimp;

    if (text.includes("두부")) return MENU_EMOJIS.tofu;
    if (text.includes("계란") || text.includes("달걀") || text.includes("메추리알")) return MENU_EMOJIS.egg;

    if (text.includes("감자")) return MENU_EMOJIS.potato;
    if (text.includes("당근")) return MENU_EMOJIS.carrot;
    if (text.includes("수박") || text.includes("사과") || text.includes("바나나") || text.includes("과일")) return MENU_EMOJIS.fruit;
    if (text.includes("매실") || text.includes("식혜") || text.includes("주스") || text.includes("음료") || text.includes("차")) return MENU_EMOJIS.drink;
    if (text.includes("밥") || text.includes("볶음밥")) return MENU_EMOJIS.rice;
    if (text.includes("국수") || text.includes("면") || text.includes("라면") || text.includes("우동") || text.includes("파스타")) return MENU_EMOJIS.noodle;
    if (text.includes("국") || text.includes("찌개") || text.includes("탕")) return MENU_EMOJIS.soup;

    if (
        text.includes("나물") || text.includes("시금치") || text.includes("콩나물") ||
        text.includes("버섯") || text.includes("오이") || text.includes("샐러드") ||
        text.includes("토마토") || text.includes("상추") || text.includes("배추") ||
        text.includes("채소") || text.includes("무침")
    ) return MENU_EMOJIS.vegetable;

    return MENU_EMOJIS.default;
}
