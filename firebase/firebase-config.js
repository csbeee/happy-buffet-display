// firebase/firebase-config.js
// TEST BRANCH ONLY: uses the HappyBuffet-Test Firebase project.
// Do not deploy this configuration to the production project.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOmdYqn2RI9QWnOBlLqLhl2MTcZJeW4lc",
  authDomain: "happybuffet-test.firebaseapp.com",
  projectId: "happybuffet-test",
  storageBucket: "happybuffet-test.firebasestorage.app",
  messagingSenderId: "225132730139",
  appId: "1:225132730139:web:7d6a6b53035648eefca5be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configure a test-project App Check site key after registering App Check in Firebase Console.
// Until then, appCheckReady remains false and App Check-enforced Cloud Function calls may fail.
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
