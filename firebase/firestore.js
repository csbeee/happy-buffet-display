// ============================================
// Happy Buffet Display
// Version : v4.5.0
// File : firebase/firestore.js
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {

    getFirestore,

    doc,

    getDoc,

    setDoc,

    collection,

    getDocs,

    addDoc,

    updateDoc,

    deleteDoc,

    serverTimestamp,

    query,

    orderBy,

    where,
    
    onSnapshot

} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/* ============================================
   Firebase Config
============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyC5jGVYthXgAdoNten0TIkjm_s6JLRh5tM",
  authDomain: "todaymenu-30fe7.firebaseapp.com",
  projectId: "todaymenu-30fe7",
  storageBucket: "todaymenu-30fe7.firebasestorage.app",
  messagingSenderId: "487318917655",
  appId: "1:487318917655:web:515f36c0cfb14508ebc252"
};

/* ============================================
   Initialize
============================================ */

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

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
    // TODAY_DOC(todayMenu/today) 문서의 변경 사항을 실시간으로 감시합니다.
    return onSnapshot(TODAY_DOC, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data()); // 데이터가 있으면 화면을 그리는 콜백 함수에 데이터 전달
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("오늘 메뉴 실시간 감지 실패:", error);
    });
}

export async function saveTodayMenu(menu) {

    await setDoc(

        TODAY_DOC,

        {

            ...menu,

            updatedAt: serverTimestamp()

        }

    );

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