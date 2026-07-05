import { db } from "./firebase-config.js";

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/**
 * 오늘 메뉴 1회 읽기
 */
export async function getTodayMenu() {
  const ref = doc(db, "todayMenu", "today");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  return null;
}

/**
 * 오늘 메뉴 저장
 */
export async function saveTodayMenu(menu) {

    await setDoc(doc(db, "todayMenu", "today"), {

        soup: menu.soup,
        main: menu.main,
        side: menu.side,
        kimchi: menu.kimchi,
        extra: menu.extra,
        dessert: menu.dessert,
        notice: menu.notice,
        updatedAt: serverTimestamp()

    });


}

/**
 * 실시간 감시
 */
export function watchTodayMenu(callback){

    const ref = doc(db,"todayMenu","today");

    return onSnapshot(ref,(snap)=>{

        if(snap.exists()){

            callback(snap.data());

        }

    });

}