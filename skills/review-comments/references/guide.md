<!-- 원본: personal-dev-vault/프롬프트/주석 관련 가이드.md (2026-07-23 복사). 원본을 고치면 이 파일도 갱신할 것. -->

> **코드에서 바로 알 수 있는 내용을 반복하는 주석은 제거하고, 코드만 봐서는 알 수 없는 제약·이유·맥락을 주석으로 남긴다.**

## 1. 동작을 그대로 읽어주는 주석

좋지 않은 예:

```ts
// 주문 상태를 취소로 변경한다.
order.status = OrderStatus.CANCELLED;

// 주문을 저장한다.
await orderRepository.save(order);
```

좋은 예:

```ts
// PG 결제 취소가 성공한 뒤에만 주문 상태를 변경한다.
// 먼저 상태를 변경하면 PG 장애 시 주문과 결제 상태가 불일치할 수 있다.
await paymentGateway.cancel(order.paymentId);

order.status = OrderStatus.CANCELLED;
await orderRepository.save(order);
```

핵심은 **무엇을 하는지**가 아니라 **왜 이 순서여야 하는지**입니다.

---

## 2. 조건문을 한국어로 반복하는 주석

좋지 않은 예:

```ts
// 사용자가 관리자이고 활성 상태인 경우
if (user.isAdmin && user.isActive) {
  grantAccess();
}
```

이 경우는 주석보다 이름을 개선하는 편이 낫습니다.

```ts
const canAccessAdminPanel = user.isAdmin && user.isActive;

if (canAccessAdminPanel) {
  grantAccess();
}
```

정말 설명이 필요하다면 정책을 남깁니다.

```ts
// 휴면 처리된 관리자는 계정 복구 전까지 관리자 화면에도 접근할 수 없다.
const canAccessAdminPanel = user.isAdmin && user.isActive;
```

---

## 3. 숫자의 의미를 설명하는 주석

좋지 않은 예:

```ts
// 30일을 밀리초로 계산한다.
const retentionPeriod = 30 * 24 * 60 * 60 * 1000;
```

코드 자체를 개선할 수 있습니다.

```ts
const AUDIT_LOG_RETENTION_DAYS = 30;
const retentionPeriodMs = daysToMilliseconds(AUDIT_LOG_RETENTION_DAYS);
```

좋은 주석은 숫자를 선택한 이유를 설명합니다.

```ts
// 개인정보 처리방침에 따라 탈퇴 사용자의 감사 로그를 30일간 보존한다.
const AUDIT_LOG_RETENTION_DAYS = 30;
```

가능하면 정책 문서나 이슈 번호도 연결합니다.

```ts
// 보안 정책 SEC-142에 따라 탈퇴 사용자의 감사 로그를 30일간 보존한다.
const AUDIT_LOG_RETENTION_DAYS = 30;
```

---

## 4. 이상해 보이는 코드의 이유

좋지 않은 예:

```ts
// 배열을 두 번 정렬한다.
items.sort(compareByCreatedAt);
items.sort(compareByPriority);
```

좋은 예:

```ts
// 우선순위가 같을 때 기존 생성 순서를 유지해야 한다.
// 현재 런타임의 stable sort 동작을 전제로 생성일 정렬 후 우선순위를 정렬한다.
items.sort(compareByCreatedAt);
items.sort(compareByPriority);
```

다만 이런 코드는 주석만 믿기보다 하나의 비교 함수로 명시하는 편이 더 안전합니다.

```ts
items.sort((a, b) => {
  return compareByPriority(a, b) || compareByCreatedAt(a, b);
});
```

주석이 필요한 이유가 코드 개선으로 없어질 수 있다면 먼저 코드를 개선해야 합니다.

---

## 5. 외부 시스템의 결함이나 제약

좋지 않은 예:

```ts
// 1초 기다린다.
await sleep(1000);
```

좋은 예:

```ts
// 외부 이미지 변환 API가 완료 응답을 반환한 직후에는
// 결과 파일이 CDN에 아직 전파되지 않을 수 있다.
// API-381 해결 전까지 최대 1초 간격으로 재조회한다.
await sleep(1000);
```

더 좋은 구현은 고정 대기보다 재시도 정책을 코드로 표현하는 것입니다.

```ts
// API-381: 변환 완료 응답과 CDN 반영 사이에 지연이 발생할 수 있다.
await retryUntilAvailable(fetchConvertedImage, {
  intervalMs: 1000,
  maxAttempts: 5,
});
```

이런 주석에는 가능하면 다음이 들어가야 합니다.

- 어떤 외부 제약인지
    
- 언제 제거할 수 있는지
    
- 추적할 이슈가 무엇인지
    

---

## 6. 비즈니스 규칙

좋지 않은 예:

```ts
// 쿠폰을 적용하지 않는다.
if (order.isEmployeePurchase) {
  return order.totalPrice;
}
```

좋은 예:

```ts
// 임직원 구매가는 이미 원가 수준으로 할인되어 있어
// 다른 프로모션 쿠폰과 중복 적용하지 않는다.
if (order.isEmployeePurchase) {
  return order.totalPrice;
}
```

더 나아가 함수 이름으로 정책을 드러낼 수도 있습니다.

```ts
if (isCouponExcludedEmployeePurchase(order)) {
  return order.totalPrice;
}
```

다만 함수 이름만으로는 **왜 중복 적용하지 않는지**까지 전달하기 어렵기 때문에 이런 경우에는 주석이 여전히 유효합니다.

---

## 7. 데이터 손실이나 순서 제약

좋지 않은 예:

```ts
// 파일을 먼저 업로드한다.
const uploadedFile = await storage.upload(file);
await database.save(uploadedFile);
```

좋은 예:

```ts
// DB 저장 후 파일 업로드를 수행하면 업로드 실패 시 유효하지 않은 파일 레코드가 남는다.
// 파일을 먼저 업로드하고, DB 저장 실패 시 아래 보상 로직에서 파일을 삭제한다.
const uploadedFile = await storage.upload(file);

try {
  await database.save(uploadedFile);
} catch (error) {
  await storage.delete(uploadedFile.key);
  throw error;
}
```

트랜잭션, 보상 처리, 락 순서처럼 **순서를 바꾸면 장애가 발생하는 코드**는 이유를 남길 가치가 큽니다.

---

## 8. 성능 때문에 직관적이지 않은 구현

좋지 않은 예:

```ts
// 성능을 위해 Map을 사용한다.
const usersById = new Map(users.map(user => [user.id, user]));
```

이 정도는 코드만 봐도 짐작할 수 있습니다.

좋은 예:

```ts
// 이 루프는 최대 10만 건의 주문을 처리한다.
// 매 주문마다 users.find()를 호출하면 O(n²)이 되므로 사용자 조회용 Map을 한 번 구성한다.
const usersById = new Map(users.map(user => [user.id, user]));
```

중요한 것은 막연한 “성능 때문”이 아니라 다음을 설명하는 것입니다.

- 데이터 규모
    
- 기존 구현의 문제
    
- 현재 구현을 선택한 이유
    

측정값이 있다면 더 좋습니다.

```ts
// 10만 건 기준 users.find() 방식은 약 8초가 걸렸고,
// Map 조회 방식은 약 120ms였다. PERF-27 참고.
const usersById = new Map(users.map(user => [user.id, user]));
```

---

## 9. 정규식 설명

좋지 않은 예:

```ts
// 이메일 정규식
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

변수명이 이미 말해주고 있습니다.

좋은 예:

```ts
// RFC 전체 검증이 목적은 아니다.
// 입력 실수를 빠르게 걸러내는 최소 형식 검사이며,
// 실제 이메일 소유 여부는 인증 메일 발송으로 확인한다.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

정규식의 구조를 해설하기보다 **검증 범위와 한계**를 설명하는 편이 실무적으로 더 중요합니다.

---

## 10. `TODO` 주석

좋지 않은 예:

```ts
// TODO: 나중에 수정
```

누가, 왜, 언제, 무엇을 해야 하는지 아무것도 알 수 없습니다.

좋은 예:

```ts
// TODO(PLAT-928): 레거시 결제 API 종료 전까지 v1 응답 형식을 지원한다.
// 모든 가맹점이 v2로 이전되면 이 분기를 제거한다.
```

좋은 TODO에는 최소한 다음이 있어야 합니다.

- 추적 가능한 이슈
    
- 현재 남겨두는 이유
    
- 제거하거나 완료할 조건
    

날짜만 적는 것은 보통 부족합니다.

```ts
// TODO: 2026년 12월에 제거
```

날짜가 와도 왜 제거해야 하는지 알 수 없기 때문입니다.

---

## 11. 예외를 무시하는 이유

좋지 않은 예:

```ts
try {
  await analytics.track(event);
} catch {
  // 무시
}
```

좋은 예:

```ts
try {
  await analytics.track(event);
} catch (error) {
  // 분석 이벤트 전송 실패가 사용자 주문 처리를 막아서는 안 된다.
  // 실패 건은 로컬 로그로 남기고 별도 수집 작업에서 재처리한다.
  logger.warn({ error, event }, 'Failed to send analytics event');
}
```

`catch`에서 예외를 삼키는 코드는 특히 주석이 중요합니다. 다만 주석만 남기고 로그·재처리 없이 실제로 완전히 무시하는 것은 위험합니다.

---

## 12. 타입 단언이나 린트 비활성화

좋지 않은 예:

```ts
// 타입 오류 무시
const user = response.data as User;
```

좋은 예:

```ts
// 이 응답은 내부 API Gateway에서 이미 UserSchema 검증을 통과한다.
// SDK 타입 정의가 아직 갱신되지 않아 임시로 단언한다. SDK-214 참고.
const user = response.data as User;
```

린트 비활성화도 마찬가지입니다.

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  initializeEditor(documentId);
}, [documentId]);
```

이것만으로는 왜 의존성을 제외했는지 알 수 없습니다.

```ts
// initializeEditor는 인스턴스 생성 시점의 옵션만 사용해야 한다.
// options 변경 때마다 재초기화하면 편집 중인 선택 영역과 undo stack이 사라진다.
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  initializeEditor(documentId);
}, [documentId]);
```

물론 실제로 의존성 문제를 구조적으로 해결할 수 있는지도 먼저 검토해야 합니다.

---

## 13. 변경 이력을 기록하는 주석

좋지 않은 예:

```ts
// 2024-03-10 김개발 수정
// 2025-08-22 이개발 다시 수정
// 기존에는 10이었지만 20으로 변경함
const limit = 20;
```

이력은 Git이 더 정확하게 관리합니다. 코드에는 현재의 이유만 남겨야 합니다.

```ts
// 공급사 API가 한 요청당 최대 20개 항목만 허용한다.
const SUPPLIER_API_BATCH_LIMIT = 20;
```

“누가 언제 바꿨는지”는 `git blame`과 커밋에서 보고, “왜 지금 20인지”는 코드에서 확인할 수 있어야 합니다.

---

## 14. 주석 처리된 코드

좋지 않은 예:

```ts
// const result = await legacyService.fetch();
// return result.data;

return newService.fetch();
```

주석 처리된 코드는 삭제하는 편이 낫습니다. 필요하면 Git에서 복구할 수 있습니다.

단, 전환 배경이 중요하다면 코드를 남기지 말고 이유만 남깁니다.

```ts
// 레거시 서비스는 2026-06-30 종료되었다.
// 신규 서비스는 응답 검증 실패 시 예외를 발생시키므로 호출부에서 별도 처리한다.
return newService.fetch();
```

---

## 실무에서 빠르게 판단하는 질문

주석을 작성한 뒤 아래 질문을 해보면 됩니다.

1. 이 주석은 코드를 그대로 한국어로 읽어주는가?
    
2. 변수명이나 함수명 개선으로 주석을 없앨 수 있는가?
    
3. 6개월 뒤에도 유효한 내용인가?
    
4. 구현이 바뀌었을 때 주석이 거짓말이 될 가능성이 높은가?
    
5. 이유, 제약, 위험, 의사결정 중 하나를 추가로 알려주는가?
    

특히 주석이 특정 함수 내부 구현을 장황하게 설명한다면, 코드가 너무 복잡하거나 이름이 부정확하다는 신호일 가능성이 큽니다.

좋은 주석의 대표적인 대상은 결국 네 가지입니다.

> **왜 이렇게 했는가, 무엇을 조심해야 하는가, 어떤 외부 제약이 있는가, 언제 제거할 수 있는가.**