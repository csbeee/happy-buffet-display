// firebase/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5jGVYthXgAdoNten0TIkjm_s6JLRh5tM",
  authDomain: "todaymenu-30fe7.firebaseapp.com",
  projectId: "todaymenu-30fe7",
  storageBucket: "todaymenu-30fe7.firebasestorage.app",
  messagingSenderId: "487318917655",
  appId: "1:487318917655:web:515f36c0cfb14508ebc252"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase Console > App Check > Web app에서 발급한 사이트 키를 입력합니다.
const APP_CHECK_SITE_KEY = "REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY";
let appCheckReady = false;
if (APP_CHECK_SITE_KEY && !APP_CHECK_SITE_KEY.startsWith("REPLACE_")) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    appCheckReady = true;
  } catch (error) {
    console.error("Firebase App Check 초기화 실패:", error);
  }
}

export { app, db, appCheckReady };