import { auth } from "../firebase/firebase-config.js";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const ADMIN_EMAIL = "seob1984@gmail.com";
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const style = document.createElement("style");
style.textContent = `
  .hb-auth-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f7f5;color:#18352c;font-family:system-ui,-apple-system,sans-serif}
  .hb-auth-card{width:min(100%,420px);box-sizing:border-box;padding:28px;border:1px solid #d9e4dd;border-radius:20px;background:#fff;box-shadow:0 18px 60px #173f351a;text-align:center}
  .hb-auth-card h1{margin:0 0 8px;font-size:24px}.hb-auth-card p{line-height:1.6;color:#52645b}
  .hb-auth-button{width:100%;padding:14px 18px;border:0;border-radius:12px;background:#173f35;color:white;font-size:16px;font-weight:700;cursor:pointer}
  .hb-auth-message{min-height:24px;margin-top:14px;font-size:14px;color:#9b2c2c}
  .topbar{flex-wrap:wrap}.topbar>.topButtons{order:3;width:100%;flex-wrap:wrap;justify-content:flex-end}
  .hb-auth-user{position:static;z-index:auto;display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 0 100%;width:100%;max-width:100%;order:2;margin:0;padding:7px 10px;border:1px solid #d9e4dd;border-radius:12px;background:#fff;font:12px system-ui,sans-serif;color:#18352c;box-sizing:border-box}
  .hb-auth-user span{max-width:min(34vw,260px);overflow-wrap:anywhere}
  .hb-auth-user button{flex:0 0 auto;border:0;border-radius:8px;padding:7px 10px;background:#e9efeb;cursor:pointer;white-space:nowrap}
  @media(max-width:768px){.topbar>.topButtons{width:100%}.hb-auth-user{order:2;width:100%}}
  @media(max-width:420px){.topbar>.topButtons{width:100%}.hb-auth-user{align-self:stretch;margin-left:0}}
`;
document.head.append(style);

const overlay = document.createElement("div");
overlay.className = "hb-auth-overlay";
overlay.innerHTML = `
  <section class="hb-auth-card" aria-labelledby="hbAuthTitle">
    <h1 id="hbAuthTitle">행복을 담은 한식뷔페</h1>
    <p>관리자 전용 화면입니다.<br>등록된 관리자 Google 계정으로 로그인해 주세요.</p>
    <button class="hb-auth-button" type="button">Google 계정으로 로그인</button>
    <div class="hb-auth-message" role="status" aria-live="polite"></div>
  </section>`;
document.body.append(overlay);

const loginButton = overlay.querySelector("button");
const message = overlay.querySelector(".hb-auth-message");
let signingIn = false;

loginButton.addEventListener("click", async () => {
  if (signingIn) return;
  signingIn = true;
  loginButton.disabled = true;
  loginButton.textContent = "로그인 중...";
  message.textContent = "";
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("관리자 Google 로그인 실패:", error);
    message.textContent = error.code === "auth/unauthorized-domain"
      ? "Firebase Authentication의 승인된 도메인에 현재 사이트를 추가해 주세요."
      : error.code === "auth/popup-blocked"
        ? "팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요."
        : "로그인하지 못했습니다. Firebase에서 Google 로그인이 활성화되어 있는지 확인해 주세요.";
  } finally {
    signingIn = false;
    loginButton.disabled = false;
    loginButton.textContent = "Google 계정으로 로그인";
  }
});

onAuthStateChanged(auth, async (user) => {
  document.querySelector(".hb-auth-user")?.remove();
  if (!user) {
    overlay.hidden = false;
    return;
  }

  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    message.textContent = `관리자 계정(${ADMIN_EMAIL})으로 로그인해 주세요.`;
    await signOut(auth);
    overlay.hidden = false;
    return;
  }

  overlay.remove();
  const userBar = document.createElement("div");
  userBar.className = "hb-auth-user";
  const email = document.createElement("span");
  email.textContent = user.email || ADMIN_EMAIL;
  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.textContent = "로그아웃";
  logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.reload();
  });
  userBar.append(email, logoutButton);
  const adminHeader = document.querySelector(".topbar");
  const actionButtons = adminHeader?.querySelector(".topButtons");
  if (adminHeader && actionButtons) {
    adminHeader.insertBefore(userBar, actionButtons);
  } else {
    (adminHeader || document.body).append(userBar);
  }
});
