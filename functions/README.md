# Firebase Cloud Functions — 식수관리 보안 기반

이 디렉터리는 식수관리용 서버 검증 기능의 첫 단계입니다. 기존 메뉴 전광판의 코드와 Firestore 규칙을 자동 변경하지 않습니다.

## 포함 기능

- `verifyCompanyCode` callable function
- Firebase App Check 강제 적용
- 거래처별 코드 해시 검증(scrypt + timing-safe comparison)
- 거래처/IP 조합 기준 실패 시도 제한
- 5분 만료의 무작위 일회성 접수 티켓 발급

## 거래처 문서 필드

```js
{
  name: "관리자가 등록한 거래처명",
  aliases: ["현장 별칭"],
  active: true,
  favorite: false,
  sortOrder: 10,
  accessCodeSalt: "<무작위 salt hex>",
  accessCodeHash: "<scrypt 결과 128자리 hex>"
}
```

확인 코드를 평문으로 Firestore에 저장하거나 클라이언트 JavaScript에 넣지 않습니다. 코드는 관리자 전용 도구에서 생성한 salt/hash만 저장해야 합니다. 실제 거래처명이나 확인 코드는 저장소에 커밋하지 않습니다.

## 중요한 미완료 항목

- 이 함수는 확인 코드만 검증하며 식수 접수나 서명을 저장하지 않습니다.
- `companyAccessTickets`와 `companyCodeAttempts` 컬렉션은 클라이언트 직접 읽기/쓰기를 금지해야 합니다.
- ticket을 소비하는 접수 제출 함수, 서명 업로드, idempotency, 서버 접수번호, 명단 중복 검증이 아직 구현되지 않았습니다.
- App Check 웹 앱 등록 및 enforcement 설정을 실제 Firebase 콘솔에서 확인해야 합니다.
- 배포 전에 Functions 에뮬레이터와 보안 테스트를 실행해야 합니다.

## 배포 전 확인

1. Firebase CLI로 프로젝트 연결 및 Functions 설정
2. 웹 앱에 Firebase App Check 설정 및 초기화
3. Firebase 콘솔에서 App Check enforcement를 확인
4. 실제 거래처별 salt/hash를 안전하게 생성·등록
5. emulator 테스트 후에만 배포
6. 루트 `firestore.rules`는 기존 메뉴 기능에 영향이 있으므로 이 단계에서 수정하지 않음

Node.js 22를 사용합니다. 배포 명령은 루트에서 프로젝트 ID와 설정을 확인한 후 실행해야 합니다.
