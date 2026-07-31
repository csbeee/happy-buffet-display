# 행복을 담은 한식뷔페 전광판 기술 문서

- 프로젝트: `happy-buffet-display`
- Repository: `csbeee/happy-buffet-display`
- 기본 브랜치: `main`
- 기술 스택: HTML5 / CSS3 / Vanilla JavaScript(ES Module) / Firebase Firestore / Firebase Hosting
- UI 프레임워크: React 미사용
- 표시 장치: Raspberry Pi 3 + 세로형 모니터 환경을 기준으로 설계

## 1. 시스템 개요

이 프로젝트는 관리자 화면에서 오늘의 메뉴를 입력하고 Firebase Firestore에 저장한 뒤, 전광판 화면이 Firestore의 오늘 메뉴 문서를 실시간으로 감시하여 화면을 갱신하는 구조이다.

```text
[관리자 브라우저]
       |
       | saveTodayMenu()
       v
[Firebase Firestore]
  todayMenu/today
       |
       | onSnapshot()
       v
[전광판 display/index.html]
       |
       +-- display/app.js
       +-- display/style.css
       +-- shared/icon-map.js
       +-- assets/icons/*.svg
```

## 2. 프론트엔드 구조

### Display

`display/index.html`은 전광판의 HTML 진입점이다.

- 일반 메뉴 레이아웃: `#normalLayout`
- 컨셉데이 레이아웃: `#specialLayout`
- 국: `#soup`
- 메인요리: `#main`
- 반찬: `#side`
- 김치: `#kimchi`
- 후식: `#dessert`
- 공지사항: `#notice`
- 마지막 저장 시간: `#updatedAt`

현재 전광판은 일반 메뉴와 컨셉데이 모드를 분리하고 `displayMode` 값에 따라 화면을 전환한다.

### Display JavaScript

`display/app.js`의 주요 책임:

1. 날짜/시간 표시
2. Firestore 오늘 메뉴 실시간 구독
3. 일반 메뉴 렌더링
4. 메뉴 개수에 따른 1열/2열 및 글자 크기 조절
5. 메뉴 카드 자동 표시/숨김
6. 공지사항 표시 및 스크롤 애니메이션
7. 마지막 저장 시간 표시
8. 컨셉데이 테마 및 섹션 렌더링
9. 일반 메뉴/컨셉데이 레이아웃 전환

## 3. Firebase 연동

현재 Firestore 연동은 `firebase/firestore.js`에서 담당한다.

Firebase SDK는 브라우저에서 Google CDN의 ES Module을 직접 import하는 방식이다.

주요 Firebase 프로젝트 정보:

- Firebase Project ID: `todaymenu-30fe7`
- Firestore 사용
- Firebase Hosting 사용을 전제로 한 정적 웹 애플리케이션

### 주요 Firestore 위치

```text
Firestore
├── todayMenu
│   └── today
│       ├── displayMode
│       ├── soup[]
│       ├── main[]
│       ├── side[]
│       ├── kimchi[]
│       ├── dessert[]
│       ├── notice
│       ├── concept{}
│       ├── sections[]
│       └── updatedAt
│
└── menus
    └── {menuId}
        ├── name
        ├── category
        ├── costLevel
        ├── meat
        ├── favorite
        ├── enabled
        ├── createdAt
        └── updatedAt
```

## 4. 실시간 데이터 흐름

전광판은 `watchTodayMenu()`를 사용하여 `todayMenu/today` 문서를 실시간 감시한다.

```text
Firestore 변경
    ↓
onSnapshot()
    ↓
watchTodayMenu(callback)
    ↓
renderToday(menu)
    ↓
displayMode 확인
    ├── normal  → renderNormal()
    └── special → renderSpecial()
```

따라서 관리자에서 메뉴를 저장하면 전광판을 새로고침하지 않아도 변경 사항이 반영되는 구조이다.

## 5. 일반 메뉴 렌더링 규칙

`renderNormal()`은 다음 데이터를 배열로 검증한 후 출력한다.

- `soup`
- `main`
- `side`
- `kimchi`
- `dessert`

메뉴 데이터가 배열이 아니면 빈 배열로 처리하여 전광판 렌더링 오류를 방지한다.

### 레이아웃 규칙

- 메인 메뉴 2개 이상: 2열
- 반찬 6개 이상: 2열
- 메뉴 8개 이상: 작은 글자
- 그 외: 큰 글자
- 메뉴가 없는 카드는 자동 숨김

## 6. 공지사항

공지사항은 문자열 기반으로 처리한다.

- 빈 값 / `undefined` / `null`: 공지 카드 숨김
- 내용이 있으면 공지 카드 표시
- 문자열 길이에 따라 애니메이션 시간을 계산
- CSS 애니메이션으로 전광판에서 흐르는 공지 형태로 표시

## 7. 컨셉데이

`displayMode === "special"`이면 일반 메뉴 대신 컨셉데이 화면을 표시한다.

현재 기본 테마:

- `bibimbap`
- `bunsik`
- `samgyeopsal`
- `chinese`
- `western`
- `healthy`
- `custom`

컨셉 데이터의 주요 구조:

```js
{
  displayMode: "special",
  concept: {
    theme: "bibimbap",
    title: "비빔밥 DAY",
    subtitle: "",
    icon: "🍚"
  },
  sections: [
    {
      title: "메뉴",
      items: ["...", "..."]
    }
  ]
}
```

## 8. SVG 아이콘

전광판은 카테고리와 메뉴 특성에 따라 SVG 아이콘을 사용한다.

현재 HTML에서 카테고리 아이콘은 `assets/icons/category/` 아래의 SVG 파일을 참조한다.

예:

```text
assets/icons/category/
├── soup.svg
├── main.svg
├── side.svg
├── kimchi.svg
├── dessert.svg
└── notice.svg
```

## 9. 브라우저 호환성 및 실행 방식

이 프로젝트는 번들러 없이 브라우저의 ES Module을 사용한다.

따라서 정적 서버 환경에서 실행해야 하며, HTML 파일을 `file://`로 직접 열기보다는 Firebase Hosting 또는 로컬 개발 서버를 사용하는 것을 권장한다.

주요 조건:

- `<script type="module">` 지원 브라우저 필요
- HTTPS 환경 권장
- Firebase SDK CDN 접근 필요
- Firestore 네트워크 접근 필요

## 10. 보안 원칙

Firebase Web SDK 설정의 `apiKey` 등은 브라우저에 포함될 수 있는 공개 설정값이다. 그러나 이것이 Firestore 데이터에 대한 접근 권한을 의미하는 것은 아니다.

실제 보안은 반드시 Firebase Authentication 및 Firestore Security Rules로 제어해야 한다.

특히 관리자 기능은 향후 다음 구조로 강화하는 것을 권장한다.

```text
관리자
  ↓
Firebase Authentication
  ↓
Firestore Security Rules
  ↓
menus / todayMenu
```

현재 개발 환경이 Firestore Test Mode를 기반으로 구성되어 있었다면, 실제 운영 전에는 반드시 Security Rules를 별도로 검토해야 한다.

## 11. 운영 시 장애 대응

### 전광판에 메뉴가 안 보이는 경우

1. 인터넷 연결 확인
2. 브라우저 개발자 콘솔 확인
3. Firestore `todayMenu/today` 존재 여부 확인
4. `displayMode` 값 확인
5. `soup/main/side/kimchi/dessert`가 배열인지 확인
6. Firebase 프로젝트 ID 확인
7. Firestore Security Rules 확인

### 실시간 반영이 안 되는 경우

1. `watchTodayMenu()`의 `onSnapshot()` 오류 확인
2. Firestore 네트워크 상태 확인
3. 관리자 저장이 실제로 `todayMenu/today`에 기록되는지 확인
4. 브라우저 콘솔의 Firebase 오류 확인

## 12. 유지보수 규칙

- 데이터 구조를 변경하면 `docs/` 문서를 함께 수정한다.
- Firestore 필드명을 변경하면 관리자/전광판 양쪽 코드를 함께 확인한다.
- HTML ID를 변경하면 `display/app.js`의 `getElementById()` 사용 부분을 함께 수정한다.
- 카테고리를 추가하면 HTML, CSS, JavaScript, 메뉴 스키마 및 아이콘 매핑을 함께 검토한다.
- Firebase 프로젝트를 변경하면 모든 Firebase 설정 파일과 Hosting 설정을 함께 검토한다.

## 13. 권장 디렉터리 구조

```text
happy-buffet-display/
├── admin/
│   ├── index.html
│   ├── app.js
│   ├── menu-ui.js
│   └── style.css
│
├── display/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── assets/
│   └── icons/
│
├── firebase/
│   ├── firebase-config.js
│   └── firestore.js
│
├── shared/
│   ├── menu-schema.js
│   └── icon-map.js
│
├── docs/
│   ├── TECHNICAL-ARCHITECTURE.md
│   ├── FIREBASE-HOSTING.md
│   └── DEPLOYMENT-GITHUB-ACTIONS.md
│
└── README.md
```
