// firebase/firebase-config.js
// TEST BRANCH ONLY: populate these values from the HappyBuffet-Test Firebase web app.
// Do not copy production project credentials into this file.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REPLACE_WITH_TEST_WEB_APP_API_KEY",
  authDomain: "happybuffet-test.firebaseapp.com",
  projectId: "happybuffet-test",
  storageBucket: "happybuffet-test.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_TEST_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_TEST_WEB_APP_ID"
};

const missingConfig = Object.entries(firebaseConfig).some(([key, value]) =>
  typeof value !== "string" ||
  !value ||
  value.startsWith("REPLACE_WITH_")
);

if (missingConfig) {
  console.warn("테스트 Firebase 설정이 아직 완료되지 않았습니다. Firebase 콘솔의 웹 앱 설정값을 입력해 주세요.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Firebase Console > App Check에서 테스트 웹 앱용 키를 등록한 후 입력합니다.
// Cloud Functions는 App Check를 강제하므로 키 설정 전에는 서버 호출이 실패합니다.
const APP_CHECK_SITE_KEY = "REPLACE_WITH_TEST_RECAPTCHA_ENTERPRISE_SITE_KEY";
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

export { app, auth, db, appCheckReady };
