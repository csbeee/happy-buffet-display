// ============================================
// Happy Buffet Display
// Version : v4.5.0
// File : shared/menu-category.js
// ============================================

export const MENU_CATEGORY = [

    {
        key: "soup",
        title: "🍲 국",
        icon: "🍲",
        min: 1,
        max: 1
    },

    {
        key: "main",
        title: "🍖 메인",
        icon: "🍖",
        min: 2,
        max: 3
    },

    {
        key: "side",
        title: "🥗 반찬",
        icon: "🥗",
        min: 6,
        max: 10
    },

    {
        key: "kimchi",
        title: "🌶 김치",
        icon: "🌶",
        min: 1,
        max: 2
    },

    {
        key: "dessert",
        title: "🍉 후식",
        icon: "🍉",
        min: 1,
        max: 3
    },

    {
        key: "notice",
        title: "📢 공지사항",
        icon: "📢",
        min: 0,
        max: 5
    }

];

/* ============================================
   Utility
============================================ */

export function getCategory(key) {

    return MENU_CATEGORY.find(item => item.key === key);

}

export function getCategoryTitle(key) {

    return getCategory(key)?.title ?? key;

}

export function getCategoryKeys() {

    return MENU_CATEGORY.map(item => item.key);

}