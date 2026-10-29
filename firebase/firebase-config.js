// firebase/firebase-config.js
// TEST BRANCH ONLY: uses the HappyBuffet-Test Firebase project.
// App Check / ReCaptchaEnterpriseProvider is intentionally not used in the free local-test setup.
// Do not deploy this configuration to the production project.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
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

// Kept for compatibility with any test-branch code that reads this flag.
// No App Check provider is initialized in this setup.
const appCheckReady = false;

export { app, auth, db, appCheckReady };
