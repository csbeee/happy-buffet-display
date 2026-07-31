# GitHub Actions → Firebase Hosting 자동 배포

## 1. 목적

GitHub `main` 브랜치에 코드가 push되면 Firebase Hosting에 자동 배포하는 CI/CD 구조를 정의한다.

```text
Developer
   ↓
git add / commit / push
   ↓
GitHub main
   ↓
GitHub Actions
   ↓
Firebase Hosting
   ↓
Raspberry Pi 전광판
```

## 2. 배포 전략

권장 트리거:

```yaml
on:
  push:
    branches:
      - main
```

즉, `main`에 push된 변경만 운영 Hosting에 자동 배포한다.

## 3. 기본 Workflow 구성

권장 파일:

```text
.github/
└── workflows/
    └── firebase-hosting.yml
```

기본 작업 순서:

1. Ubuntu runner 시작
2. GitHub repository checkout
3. Node.js 환경 준비
4. Firebase CLI 설치
5. Firebase 인증
6. Firebase Hosting 배포

## 4. 인증 방식

Firebase 자동 배포에서는 GitHub Actions Secret을 사용하여 인증 정보를 관리하는 방식을 권장한다.

절대로 다음 정보를 소스 코드에 직접 입력하지 않는다.

- 서비스 계정 private key
- JSON credential 전체 내용
- CI 전용 비밀 토큰

권장 Secret 예시:

```text
FIREBASE_SERVICE_ACCOUNT
```

또는 Firebase가 지원하는 최신 CI 인증 방식을 사용한다.

## 5. 배포 명령

기본 Hosting 배포:

```bash
firebase deploy --only hosting
```

Firestore Rules까지 함께 관리하는 경우에는 별도의 workflow 또는 명시적인 배포 단계로 분리하는 것을 권장한다.

```bash
firebase deploy --only hosting,firestore
```

운영 환경에서는 Hosting 코드 변경과 Firestore Rules 변경을 같은 배포로 묶기 전에 권한 변경의 영향을 검토한다.

## 6. 권장 Workflow 개념

```yaml
name: Firebase Hosting Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy to Firebase Hosting
        run: firebase deploy --only hosting --non-interactive
        env:
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

위 코드는 **구조 예시**이며 실제 repository의 Firebase 인증 방식과 `firebase.json` 구성에 맞춰 확정해야 한다.

## 7. Pull Request 배포와 운영 배포 분리

운영 안정성을 위해 다음 구조를 권장한다.

```text
feature branch
      ↓
Pull Request
      ↓
검증 / Preview
      ↓
merge → main
      ↓
Production Hosting deploy
```

`main` push만 실제 운영 배포가 되도록 구성하면 실수로 개발 중인 코드를 운영 전광판에 올리는 위험을 줄일 수 있다.

## 8. 실패 시 확인 순서

GitHub Actions가 실패하면 다음 순서로 확인한다.

1. Checkout 실패 여부
2. Node.js / Firebase CLI 설치 실패 여부
3. Firebase 인증 실패 여부
4. `firebase.json` 오류 여부
5. Hosting public 경로 오류 여부
6. 배포 파일 누락 여부
7. Firebase 프로젝트 선택 오류 여부

## 9. 배포 성공 후 검증

자동 배포 성공만으로 운영 정상 상태라고 판단하지 않는다.

최소한 다음을 확인한다.

```text
GitHub Actions = success
        ↓
Hosting URL 접속
        ↓
index.html 정상
        ↓
CSS 정상
        ↓
JS module 정상
        ↓
Firebase Firestore 연결 정상
        ↓
todayMenu/today 표시 정상
```

## 10. Git 작업 규칙

개발 PC:

```bash
git status
git pull origin main

# 작업

git add .
git commit -m "feat: ..."
git push origin main
```

push 이후:

```text
GitHub Actions 확인
       ↓
Firebase Hosting 배포 확인
       ↓
전광판 실제 화면 확인
```

## 11. 현재 프로젝트에서 주의할 점

현재 저장소에는 Firebase Firestore 연동 코드는 존재하지만, GitHub 기준 `firebase.json`은 확인되지 않았다.

따라서 자동 배포를 실제로 활성화하기 전에 다음 작업이 필요하다.

- `firebase.json` 생성
- `.firebaserc` 또는 Firebase 프로젝트 연결 설정
- Hosting public 경로 확정
- GitHub Actions workflow 추가
- GitHub Actions 인증 Secret 설정
- 최초 수동 배포로 Hosting 동작 검증
- 이후 자동 배포 활성화

## 12. 권장 최종 운영 구조

```text
                 GitHub
                    │
              main branch
                    │
             GitHub Actions
                    │
        ┌───────────┴───────────┐
        │                       │
 Firebase Hosting          Firebase Firestore
        │                       │
   ┌────┴────┐             todayMenu/today
   │         │                    │
 display   admin                  │
   │         │                    │
   └────┬────┘                    │
        │                         │
        └──────── Raspberry Pi ───┘
                   전광판
```

이 구조를 기준으로 하면 소스 코드, 정적 웹 배포, 메뉴 데이터, 실시간 전광판을 각각 역할별로 분리하면서도 하나의 Git 저장소에서 관리할 수 있다.
