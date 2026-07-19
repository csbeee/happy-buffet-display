// ============================================
// menu-history.js
// 최근 사용 / 즐겨찾기
// ============================================

const HISTORY_KEY = "happy_buffet_recent";
const FAVORITE_KEY = "happy_buffet_favorite";

const MAX_HISTORY = 30;

/* ============================================
   최근 사용
============================================ */

export function getRecentMenus() {

    return JSON.parse(

        localStorage.getItem(HISTORY_KEY)

    ) || [];

}

export function addRecentMenu(name) {

    if (!name) return;

    let list = getRecentMenus();

    list = list.filter(item => item !== name);

    list.unshift(name);

    list = list.slice(0, MAX_HISTORY);

    localStorage.setItem(

        HISTORY_KEY,

        JSON.stringify(list)

    );

}

/* ============================================
   즐겨찾기
============================================ */

export function getFavoriteMenus() {

    return JSON.parse(

        localStorage.getItem(FAVORITE_KEY)

    ) || [];

}

export function isFavorite(name) {

    return getFavoriteMenus().includes(name);

}

export function toggleFavorite(name) {

    let list = getFavoriteMenus();

    if (list.includes(name)) {

        list = list.filter(item => item !== name);

    } else {

        list.unshift(name);

    }

    localStorage.setItem(

        FAVORITE_KEY,

        JSON.stringify(list)

    );

}