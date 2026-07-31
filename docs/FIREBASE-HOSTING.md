# Firebase Hosting 기술 문서

## 1. 목적

`happy-buffet-display`는 HTML/CSS/Vanilla JavaScript로 구성된 정적 웹 애플리케이션이므로 Firebase Hosting을 이용해 전광판과 관리자 페이지를 웹으로 배포할 수 있다.

Firebase Hosting의 역할은 **HTML/CSS/JavaScript 및 SVG 등의 정적 파일 제공**이며, 메뉴 데이터 저장과 실시간 변경 감지는 Firebase Firestore가 담당한다.

```text
Firebase Hosting
├── display/index.html
├── display/app.js
├── display/style.css
├── admin/index.html
├── admin/*.js
├── admin/style.css
├── assets/**
├── firebase/**
└── shared/**

Firebase Firestore
├── todayMenu/today
└── menus/{menuId}
```

## 2. 현재 프로젝트 상태

현재 GitHub 저장소의 코드에는 Firebase Firestore 연동 코드가 포함되어 있으며, `display/app.js`는 `watchTodayMenu()`를 통해 `todayMenu/today`를 실시간 감시한다.

반면 현재 저장소를 기준으로 `firebase.json`은 확인되지 않는다. 따라서 Firebase Hosting을 실제 배포 대상으로 확정하려면 Hosting 설정 파일을 추가하고 배포 디렉터리를 명확히 정의해야 한다.

## 3. Hosting 배포 디렉터리 설계

현재 프로젝트에는 `display/`와 `admin/`이 각각 독립된 HTML 진입점을 가지고 있다.

운영 URL 설계는 다음 두 가지 방식 중 하나를 선택할 수 있다.

### 방식 A - Firebase Hosting 하나에서 경로 분리

```text
https://<project>.web.app/display/
https://<project>.web.app/admin/
```

장점:

- 하나의 Hosting 사이트로 관리 가능
- 현재 디렉터리 구조와 잘 맞음
- 관리자/전광판 파일을 명확하게 분리 가능

### 방식 B - Hosting 사이트를 별도로 분리

전광판과 관리자 페이지를 서로 다른 Firebase Hosting site/target으로 운영한다.

```text
전광판 → display 사이트
관리자 → admin 사이트
```

운영 규모가 커지거나 관리자 접근 통제가 강화될 경우 검토한다.

## 4. 권장 초기 Hosting 설정

현재 구조를 최대한 유지하려면 프로젝트 루트에 Firebase CLI 설정을 추가한다.

권장 기본 방향:

```text
happy-buffet-display/
├── firebase.json
├── .firebaserc
├── admin/
├── display/
├── assets/
├── firebase/
├── shared/
└── docs/
```

전광판 URL을 `/display/`로 사용할 경우 Hosting public root는 프로젝트 루트로 두는 것이 편리하다.

예시 개념:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true
  }
}
```

위 설정은 **예시**이며 실제 배포 전에 Firebase 프로젝트와 원하는 URL 구조에 맞춰 검증해야 한다.

## 5. Firebase CLI 기본 절차

Firebase CLI가 설치되어 있고 로그인되어 있다는 전제이다.

```bash
firebase login
firebase projects:list
```

프로젝트 초기화:

```bash
firebase init hosting
```

프로젝트 선택 시 현재 Firestore에서 사용하는 프로젝트를 선택한다.

```text
Project ID: todaymenu-30fe7
```

## 6. 배포 전 확인

배포 전 다음 항목을 확인한다.

### 필수 파일

```text
display/index.html
display/app.js
display/style.css
admin/index.html
firebase/firestore.js
shared/*
assets/icons/*
```

### 브라우저 실행 확인

로컬 개발 서버에서 다음 URL을 확인한다.

```text
/display/
/admin/
```

특히 ES Module은 `file://` 직접 실행보다 HTTP 서버에서 테스트해야 한다.

## 7. Hosting 배포

기본 배포:

```bash
firebase deploy --only hosting
```

Firestore Rules까지 함께 배포하도록 구성한 경우:

```bash
firebase deploy --only hosting,firestore
```

단, Firestore Rules 변경은 별도 검토 후 배포한다.

## 8. 배포 검증

배포 후 다음을 확인한다.

1. 전광판 URL 접속
2. CSS 로딩 확인
3. SVG 아이콘 로딩 확인
4. Firebase SDK 로딩 확인
5. Firestore 연결 확인
6. `todayMenu/today` 메뉴 출력 확인
7. 관리자에서 메뉴 저장
8. 전광판에서 새로고침 없이 메뉴 변경 확인
9. 컨셉데이 모드 전환 확인
10. 공지사항 출력 확인

## 9. 캐시 및 업데이트

Firebase Hosting은 정적 파일을 CDN을 통해 제공하므로 CSS/JS 변경 후 브라우저 캐시 때문에 이전 파일이 보이는지 확인해야 한다.

운영 중 캐시 문제가 반복되면 파일명에 버전을 포함하는 방식 또는 적절한 Cache-Control 정책을 검토한다.

## 10. Raspberry Pi 전광판 운영

Raspberry Pi 3에서는 Chromium 계열 브라우저를 전광판 전용 화면으로 실행하는 방식을 권장한다.

권장 운영 흐름:

```text
Raspberry Pi 부팅
    ↓
네트워크 연결
    ↓
브라우저 자동 실행
    ↓
Firebase Hosting /display/
    ↓
Firestore onSnapshot 연결
    ↓
오늘 메뉴 실시간 표시
```

전광판은 새로고침 없이 Firestore 변경을 받을 수 있도록 현재의 `watchTodayMenu()` 구조를 유지한다.

## 11. 장애 대응

### 화면 자체가 열리지 않음

- Raspberry Pi 네트워크 확인
- Hosting URL 확인
- Firebase Hosting 배포 상태 확인
- 브라우저 콘솔 확인

### 화면은 열리지만 메뉴가 없음

- Firestore `todayMenu/today` 확인
- Firestore Rules 확인
- Firebase Project ID 확인
- 브라우저 콘솔에서 Firestore 오류 확인

### 아이콘만 안 나옴

- SVG 파일 경로 확인
- 대소문자 확인
- `assets/icons/`가 Hosting 배포 대상에 포함되는지 확인

### 저장 후 전광판에 반영되지 않음

- 관리자 저장 성공 여부 확인
- Firestore 문서 변경 확인
- `onSnapshot()` 오류 확인
- 인터넷 연결 확인

## 12. 보안

Firebase Web SDK의 설정값을 소스 코드에 포함하는 것 자체는 일반적인 웹 앱 구조에서 가능하지만, Firestore 권한을 공개적으로 허용해서는 안 된다.

운영 전 반드시 다음을 적용한다.

- Firestore Security Rules 강화
- 관리자 Firebase Authentication 적용
- 관리자 쓰기 권한 제한
- 전광판은 필요한 데이터만 읽도록 권한 최소화
- 테스트 모드 사용 종료

특히 현재 프로젝트가 개발 과정에서 Firestore Test Mode를 사용했다면 운영 배포 전에 Rules를 반드시 변경한다.

## 13. GitHub와 Firebase Hosting 연동

향후 GitHub에 `main` 브랜치가 push되면 Firebase Hosting으로 자동 배포하도록 GitHub Actions를 구성할 수 있다.

권장 흐름:

```text
git push origin main
        ↓
GitHub Actions
        ↓
Checkout
        ↓
Firebase 인증
        ↓
firebase deploy --only hosting
        ↓
Firebase Hosting 업데이트
```

세부 CI/CD 설계는 `docs/DEPLOYMENT-GITHUB-ACTIONS.md`를 참조한다.

## 14. 운영 원칙

- 코드 변경은 GitHub `main` 기준으로 관리
- 배포는 가능하면 GitHub Actions로 자동화
- Firebase Console에서 직접 파일을 수정하지 않음
- Firestore 데이터와 Hosting 소스 코드를 분리해서 관리
- 배포 전 로컬 테스트 후 GitHub push
- 운영 Rules 변경은 별도 검토 후 적용
