// firebase/firebase-config.js
// PRODUCTION: Happy Buffet Display / Meal Management.
// Keep the production Firebase project separate from happybuffet-test.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
const auth = getAuth(app);

// App Check is intentionally not initialized in this free production setup.
const appCheckReady = false;

export { app, auth, db, appCheckReady };
