// ============================================
// Happy Buffet Display
// Version : v4.5.0
// File : firebase/firestore.js
// ============================================


import {

    doc,

    getDoc,

    setDoc,

    writeBatch,

    collection,

    getDocs,

    addDoc,

    updateDoc,

    deleteDoc,

    serverTimestamp,

    query,

    orderBy,

    limit,

    where,
    
    onSnapshot

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Use the shared TEST Firebase project configuration for all admin Firestore access.
import { db } from "./firebase-config.js";

/* ============================================
   Collection
============================================ */


const TODAY_DOC = doc(db, "todayMenu", "today");

const LIBRARY = collection(db, "menus");

/* ============================================
   오늘 메뉴
============================================ */

export async function getTodayMenu() {

    const snapshot = await getDoc(TODAY_DOC);

    if (!snapshot.exists()) {

        return null;

    }

    return snapshot.data();

}

// 🔥여기에 이 실시간 경청 함수를 새로 추가해 줍니다!
export function watchTodayMenu(callback) {
    let todayMenu = null;
    let todaySchedule = null;
    let watchedDate = "";
    let stopSchedule = null;

    const getKoreaDate = () => new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    const emit = () => {
        if (!todaySchedule) {
            callback(todayMenu);
            return;
        }

        const lunch = todaySchedule.lunch || {};
        const dinner = todaySchedule.dinner || {};
        const toItems = value => Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()) : [];
        const toNotice = value => Array.isArray(value) ? value.filter(Boolean).join(" · ") : (typeof value === "string" ? value : "");

        callback({
            ...(todayMenu || {}),
            soup: toItems(lunch.soup),
            main: toItems(lunch.main),
            side: [...toItems(lunch.side), ...toItems(lunch.service)],
            kimchi: [],
            dessert: toItems(lunch.dessert),
            notice: toNotice(lunch.notice),
            dinner: {
                ...(todayMenu?.dinner || {}),
                soup: toItems(dinner.soup),
                main: toItems(dinner.main),
                side: [...toItems(dinner.side), ...toItems(dinner.service)],
                kimchi: [],
                dessert: toItems(dinner.dessert),
                notice: toNotice(dinner.notice),
                leftovers: []
            },
            displayMode: todayMenu?.displayMode === "dinner"
                ? "dinner"
                : todayMenu?.displayMode === "special" ? "special" : "lunch",
            displayOrientation: todayMenu?.displayOrientation === "landscape" ? "landscape" : "portrait",
            updatedAt: todaySchedule.updatedAt || todayMenu?.updatedAt
        });
    };

    const watchScheduleForToday = () => {
        const date = getKoreaDate();
        if (date === watchedDate) return;

        watchedDate = date;
        stopSchedule?.();
        todaySchedule = null;

        stopSchedule = onSnapshot(
            doc(db, "menuSchedules", date),
            snapshot => {
                todaySchedule = snapshot.exists() ? snapshot.data() : null;
                emit();
            },
            error => console.error("날짜별 메뉴 실시간 감지 실패:", error)
        );
    };

    const stopToday = onSnapshot(
        TODAY_DOC,
        snapshot => {
            todayMenu = snapshot.exists() ? snapshot.data() : null;
            emit();
        },
        error => console.error("오늘 메뉴 실시간 감지 실패:", error)
    );

    watchScheduleForToday();
    const rolloverTimer = setInterval(watchScheduleForToday, 60 * 1000);

    return () => {
        stopToday();
        stopSchedule?.();
        clearInterval(rolloverTimer);
    };
}

export async function getMenuSchedule(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
        throw new Error("날짜 형식이 올바르지 않습니다.");
    }
    const snapshot = await getDoc(doc(db, "menuSchedules", date));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveMenuSchedule(record) {
    if (!record?.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        throw new Error("저장할 날짜가 올바르지 않습니다.");
    }
    await setDoc(
        doc(db, "menuSchedules", record.date),
        { ...record, updatedAt: serverTimestamp() },
        { merge: true }
    );
}

export async function importMenuSchedules(records) {
    if (!Array.isArray(records) || !records.length) {
        throw new Error("등록할 날짜별 메뉴 데이터가 없습니다.");
    }

    // Firestore batch 한도보다 여유 있게 400건씩 저장합니다.
    for (let offset = 0; offset < records.length; offset += 400) {
        const batch = writeBatch(db);
        records.slice(offset, offset + 400).forEach(record => {
            if (!record?.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
                throw new Error("날짜 형식이 올바르지 않은 메뉴 데이터가 포함되어 있습니다.");
            }
            batch.set(doc(db, "menuSchedules", record.date), {
                ...record,
                updatedAt: serverTimestamp(),
                importedAt: serverTimestamp(),
                importSource: "2026-menu-history"
            });
        });
        await batch.commit();
    }

    return records.length;
}

export async function saveTodayMenu(menu) {
    // 현재 메뉴 문서와 이력 문서를 한 번의 batch로 저장합니다.
    // 한글 날짜는 한국 시간 기준으로 기록합니다.
    const now = new Date();
    const menuDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(now);

    const savedMenu = {
        ...menu,
        displayMode: menu.displayMode ?? "normal",
        concept: menu.concept ?? {
            enabled: false,
            title: "",
            subtitle: "",
            icon: ""
        },
        sections: Array.isArray(menu.sections) ? menu.sections : [],
        updatedAt: serverTimestamp()
    };

    const historyRef = doc(collection(db, "menuHistory"));
    const batch = writeBatch(db);

    batch.set(TODAY_DOC, savedMenu);

    batch.set(historyRef, {
        ...savedMenu,
        menuDate,
        savedAt: serverTimestamp(),
        source: "admin-save"
    });

    await batch.commit();
}

/* ============================================
   메뉴 이력 조회
   - 최근 200개 이력을 최신순으로 반환
============================================ */

export async function getMenuHistory(maxItems = 200) {
    const historyCollection = collection(db, "menuHistory");
    const historyQuery = query(
        historyCollection,
        orderBy("savedAt", "desc"),
        limit(Math.max(1, Math.min(Number(maxItems) || 200, 500)))
    );
    const snapshot = await getDocs(historyQuery);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}

/* ============================================
   메뉴 라이브러리
============================================ */
/* ============================================
   메뉴 라이브러리 조회
============================================ */

export async function getMenuLibrary() {

    const snapshot = await getDocs(LIBRARY);

    const list = [];

    snapshot.forEach(docSnap => {

        list.push({

            id: docSnap.id,

            ...docSnap.data()

        });

    });

    list.sort((a, b) => {

        if (a.category === b.category) {

            return a.name.localeCompare(

                b.name,

                "ko"

            );

        }

        return a.category.localeCompare(

            b.category,

            "ko"

        );

    });

    return list;

}

/* ============================================
   메뉴 수정
============================================ */

export async function updateLibraryMenu(

    id,

    menu

) {

    await updateDoc(

        doc(db, "menus", id),

        {

            ...menu,

            updatedAt: serverTimestamp()

        }

    );

}

/* ============================================
   메뉴 삭제
============================================ */

export async function deleteLibraryMenu(id) {

    await deleteDoc(

        doc(db, "menus", id)

    );

}

/* ============================================
   메뉴 추가
============================================ */

export async function addLibraryMenu(menu) {

    return await addDoc(

        LIBRARY,

        {

            name: menu.name,

            category: menu.category,

            costLevel: menu.costLevel ?? "medium",

            meat: menu.meat ?? "none",

            favorite: menu.favorite ?? false,

            enabled: menu.enabled ?? true,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        }

    );

}

/* ============================================
   Save Info
============================================ */

export function formatUpdatedAt(timestamp) {

    if (!timestamp) {

        return "";

    }

    if (timestamp.toDate) {

        return timestamp

            .toDate()

            .toLocaleString("ko-KR");

    }

    return "";

}

/* ============================================
   이름 중복 확인
============================================ */
/* ============================================
   메뉴명 중복 확인
============================================ */

export async function existsMenu(name, excludeId = null) {

    const snapshot = await getDocs(LIBRARY);

    const keyword = name.trim().toLowerCase();

    for (const docItem of snapshot.docs) {

        if (excludeId && docItem.id === excludeId) {

            continue;

        }

        const data = docItem.data();

        if (

            data.name &&

            data.name.trim().toLowerCase() === keyword

        ) {

            return true;

        }

    }

    return false;

}

/* ============================================
   카테고리별 조회
============================================ */

export async function getMenusByCategory(

    category

) {

    const q = query(

        LIBRARY,

        where(

            "category",

            "==",

            category

        )

    );

    const snapshot = await getDocs(q);

    const list = [];

    snapshot.forEach(docSnap => {

        list.push({

            id: docSnap.id,

            ...docSnap.data()

        });

    });

    list.sort((a, b) =>

        a.name.localeCompare(

            b.name,

            "ko"

        )

    );

    return list;

}

/* ============================================
   즐겨찾기
============================================ */

export async function setFavorite(

    id,

    favorite

) {

    await updateDoc(

        doc(db, "menus", id),

        {

            favorite,

            updatedAt: serverTimestamp()

        }

    );

}

/* ============================================
   사용 여부
============================================ */

export async function setEnabled(

    id,

    enabled

) {

    await updateDoc(

        doc(db, "menus", id),

        {

            enabled,

            updatedAt: serverTimestamp()

        }

    );

}