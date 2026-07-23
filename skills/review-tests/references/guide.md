<!-- 원본: personal-dev-vault/프롬프트/테스트 코드 가이드.md (2026-07-23 복사). 원본을 고치면 이 파일도 갱신할 것. -->
# 테스트 코드에서 피해야 할 안티패턴

테스트의 목적은 단순히 코드가 실행된다는 사실을 확인하거나 커버리지 수치를 높이는 것이 아니다.

> **테스트의 목적은 중요한 동작이 깨졌을 때 실패하고, 동작이 유지되는 리팩터링에는 영향을 받지 않는 것이다.**

좋은 테스트는 다음 두 가지 성질을 동시에 가져야 한다.

- 실제 결함이 생겼을 때 실패한다.
- 외부 동작이 바뀌지 않은 리팩터링에서는 계속 통과한다.

여기서 말하는 외부 동작은 반드시 화면이나 HTTP 응답만을 의미하지 않는다. 반환값, 저장된 상태, 발생한 이벤트, 외부 시스템으로 전달한 명령처럼 해당 모듈이 책임지는 **관찰 가능한 결과**를 의미한다.

## False Positive와 False Negative

테스트에서 두 용어는 다음 의미로 사용한다.

- **False Positive**: 실제 기능은 정상인데 테스트가 실패한다.
- **False Negative**: 실제 기능에 결함이 있는데 테스트가 통과한다.

구현 세부 사항에 과도하게 결합된 테스트는 False Positive를 많이 만들고, 검증이 약하거나 모킹이 과도한 테스트는 False Negative를 많이 만든다.

---

## 1. 실제 기능을 검증하지 않는 테스트

좋지 않은 예:

```ts
it('사용자를 생성한다', async () => {
  userRepository.save.mockResolvedValue(undefined);

  await userService.createUser({
    email: 'user@example.com',
    name: 'Kim',
  });

  expect(userRepository.save).toHaveBeenCalled();
});
```

이 테스트는 `save`가 호출됐다는 사실만 확인한다.

다음과 같은 결함이 있어도 테스트는 통과할 수 있다.

- 이메일이 잘못 저장된다.
    
- 이름이 누락된다.
    
- 이미 존재하는 사용자가 중복 생성된다.
    
- 저장할 객체가 `undefined`다.
    
- 반환되는 사용자 정보가 잘못됐다.
    

조금 더 나은 테스트:

```ts
it('입력받은 정보로 사용자를 생성한다', async () => {
  const repository = new InMemoryUserRepository();
  const userService = new UserService(repository);

  const createdUser = await userService.createUser({
    email: 'user@example.com',
    name: 'Kim',
  });

  const savedUser = await repository.findById(createdUser.id);

  expect(savedUser).toMatchObject({
    email: 'user@example.com',
    name: 'Kim',
  });
});
```

이 테스트는 내부에서 어떤 메서드가 몇 번 호출됐는지가 아니라, 사용자 생성 후 실제로 관찰할 수 있는 결과를 검증한다.

테스트를 작성한 뒤 다음 질문에 답할 수 있어야 한다.

> 이 테스트는 구체적으로 어떤 버그를 발견할 수 있는가?

명확한 답이 없다면 테스트가 코드만 실행하고 있을 가능성이 크다.

---

## 2. 구현 디테일을 테스트하는 테스트

좋지 않은 예:

```ts
it('주문을 생성할 때 검증 후 저장한다', async () => {
  const validateSpy = vi.spyOn(
    orderService as unknown as {
      validateOrder: () => void;
    },
    'validateOrder',
  );

  const calculateSpy = vi.spyOn(
    orderService as unknown as {
      calculatePrice: () => number;
    },
    'calculatePrice',
  );

  await orderService.createOrder(input);

  expect(validateSpy).toHaveBeenCalledTimes(1);
  expect(calculateSpy).toHaveBeenCalledTimes(1);
  expect(validateSpy).toHaveBeenCalledBefore(calculateSpy);
});
```

이 테스트는 주문이 제대로 생성됐는지가 아니라 내부 메서드 구성과 호출 순서를 검증한다.

다음과 같은 정상적인 리팩터링에도 실패한다.

- `validateOrder`를 다른 함수에 합친다.
    
- 검증과 가격 계산 순서를 바꾼다.
    
- 두 메서드를 순수 함수로 이동한다.
    
- 메서드 이름을 변경한다.
    
- 한 번의 순회로 검증과 계산을 함께 처리한다.
    

좋은 예:

```ts
it('유효한 주문의 최종 금액을 계산해 저장한다', async () => {
  const order = await orderService.createOrder({
    productId: 'product-1',
    quantity: 2,
  });

  expect(order).toMatchObject({
    productId: 'product-1',
    quantity: 2,
    totalPrice: 20_000,
    status: 'PENDING',
  });
});
```

검증 로직과 계산 로직이 어떻게 구성돼 있든 최종 계약이 유지되면 테스트는 통과한다.

### 구현 디테일 테스트가 특히 위험한 형태

```ts
expect(repository.findById).toHaveBeenCalledTimes(1);
expect(mapper.toEntity).toHaveBeenCalledWith(input);
expect(validator.validate).toHaveBeenCalledBefore(repository.save);
expect(eventBus.publish).toHaveBeenNthCalledWith(1, expectedEvent);
```

이러한 검증은 구현 변경을 실제 기능 장애처럼 취급한다.

---

## 3. 과도한 모킹으로 아무것도 검증하지 않는 테스트

좋지 않은 예:

```ts
it('주문을 생성한다', async () => {
  validator.validate.mockReturnValue(true);
  productRepository.findById.mockResolvedValue(mockProduct);
  priceCalculator.calculate.mockReturnValue(20_000);
  orderFactory.create.mockReturnValue(mockOrder);
  orderRepository.save.mockResolvedValue(mockOrder);
  eventBus.publish.mockResolvedValue(undefined);

  const result = await orderService.createOrder(input);

  expect(result).toBe(mockOrder);
});
```

이 테스트에서 실제로 동작하는 것은 `OrderService` 내부의 호출 연결뿐이다.

가격 계산기, 주문 생성 규칙, 검증 로직, 저장 결과를 모두 테스트가 직접 정해주고 있으므로 실제 비즈니스 로직이 잘못돼도 발견하지 못한다.

심지어 서비스가 다음처럼 구현돼 있어도 테스트가 통과할 수 있다.

```ts
async createOrder(input: CreateOrderInput) {
  this.validator.validate(input);
  const product = await this.productRepository.findById(input.productId);
  const price = this.priceCalculator.calculate(product, input.quantity);
  const order = this.orderFactory.create(input, price);
  await this.orderRepository.save(order);
  await this.eventBus.publish(order);
  return order;
}
```

각 협력 객체가 올바른 일을 하는지는 전혀 검증되지 않는다.

좋은 예:

```ts
it('상품 가격과 수량을 기준으로 주문 금액을 계산한다', async () => {
  const productRepository = new InMemoryProductRepository([
    {
      id: 'product-1',
      price: 10_000,
    },
  ]);

  const orderRepository = new InMemoryOrderRepository();
  const eventPublisher = {
    publish: vi.fn(),
  };

  const orderService = new OrderService({
    productRepository,
    orderRepository,
    eventPublisher,
    priceCalculator: new PriceCalculator(),
  });

  const order = await orderService.createOrder({
    productId: 'product-1',
    quantity: 2,
  });

  expect(order.totalPrice).toBe(20_000);
});
```

가격 계산처럼 빠르고 결정적인 도메인 로직은 실제 구현을 사용한다. 이벤트 브로커나 외부 결제 API처럼 테스트에서 직접 실행하기 어려운 경계만 대체한다.

### 모킹의 현실적인 기준

다음 대상은 모킹하거나 테스트 대역으로 교체할 가치가 있다.

- 외부 결제 시스템
    
- 메일·문자 발송 시스템
    
- 외부 HTTP API
    
- 실제 메시지 브로커
    
- 현재 시간
    
- 난수 및 UUID 생성기
    
- 매우 느리거나 비결정적인 자원
    

반대로 다음 대상까지 모두 모킹하면 테스트 가치가 크게 떨어진다.

- 순수 계산 함수
    
- 도메인 객체
    
- 값 객체
    
- 유효성 규칙
    
- 데이터 변환 로직
    
- 테스트에서 쉽게 대체할 수 있는 저장소
    

모킹의 목적은 테스트를 통과시키는 것이 아니라 **비결정적이거나 비싼 외부 경계를 통제하는 것**이다.

---

## 4. 호출 여부를 결과보다 중요하게 검증하는 테스트

좋지 않은 예:

```ts
it('장바구니 금액을 계산한다', async () => {
  await cartService.calculateTotal(cart);

  expect(priceCalculator.calculate).toHaveBeenCalledTimes(3);
  expect(discountService.apply).toHaveBeenCalledTimes(1);
});
```

호출 횟수는 대부분 사용자에게 중요한 동작이 아니다.

내부 구현을 한 번의 일괄 계산으로 변경하면 결과가 같아도 테스트가 실패한다.

좋은 예:

```ts
it('상품 금액과 할인을 반영한 최종 금액을 반환한다', async () => {
  const total = await cartService.calculateTotal({
    items: [
      { price: 10_000, quantity: 2 },
      { price: 5_000, quantity: 1 },
    ],
    coupon: {
      discountAmount: 3_000,
    },
  });

  expect(total).toBe(22_000);
});
```

### 호출 검증이 필요한 경우

호출 자체가 외부에서 관찰되는 결과라면 interaction 검증이 필요하다.

```ts
it('주문이 완료되면 고객에게 주문 완료 메일을 한 번 발송한다', async () => {
  await orderService.completeOrder('order-1');

  expect(emailSender.sendOrderCompleted).toHaveBeenCalledOnce();
  expect(emailSender.sendOrderCompleted).toHaveBeenCalledWith({
    orderId: 'order-1',
    recipient: 'user@example.com',
  });
});
```

메일 발송, 결제 승인, 감사 로그 기록, 이벤트 발행처럼 외부 시스템에 명령을 전달하는 것이 기능의 일부라면 호출 검증은 유효하다.

다만 이 경우에도 내부 보조 함수의 호출이 아니라 **시스템 경계에 전달되는 명령**을 검증해야 한다.

---

## 5. 검증이 너무 약한 테스트

좋지 않은 예:

```ts
it('사용자 정보를 반환한다', async () => {
  const response = await request(app)
    .get('/users/user-1')
    .expect(200);

  expect(response.body).toBeDefined();
});
```

응답이 다음과 같아도 테스트는 통과한다.

```ts
{
  "message": "success"
}
```

또는:

```ts
{
  "id": "wrong-user",
  "email": null
}
```

좋은 예:

```ts
it('요청한 사용자의 공개 정보를 반환한다', async () => {
  const response = await request(app)
    .get('/users/user-1')
    .expect(200);

  expect(response.body).toEqual({
    id: 'user-1',
    name: 'Kim',
    email: 'user@example.com',
  });
});
```

응답 전체를 고정할 필요가 없다면 중요한 계약만 검증할 수도 있다.

```ts
expect(response.body).toMatchObject({
  id: 'user-1',
  email: 'user@example.com',
});

expect(response.body).not.toHaveProperty('passwordHash');
```

좋은 테스트는 정상 결과뿐 아니라 **절대로 노출되면 안 되는 정보**도 검증할 수 있다.

검증이 너무 약한 테스트는 결함이 있어도 통과하므로 False Negative를 만든다.

---

## 6. 중요하지 않은 값까지 지나치게 엄격하게 검증하는 테스트

좋지 않은 예:

```ts
expect(createdOrder).toEqual({
  id: '94b912ce-7f85-43af-b11b-9652ab743d1f',
  productId: 'product-1',
  status: 'PENDING',
  createdAt: '2026-07-15T09:12:31.381Z',
  updatedAt: '2026-07-15T09:12:31.381Z',
});
```

ID 생성 방식이나 시간 표현이 변경되면 주문 생성 기능이 정상이어도 테스트가 실패한다.

좋은 예:

```ts
expect(createdOrder).toMatchObject({
  productId: 'product-1',
  status: 'PENDING',
});

expect(createdOrder.id).toEqual(expect.any(String));
expect(createdOrder.createdAt).toBeInstanceOf(Date);
```

또는 시간과 ID 생성기를 주입해 결정적인 테스트를 만들 수 있다.

```ts
const fixedClock = new FixedClock(
  new Date('2026-07-15T00:00:00.000Z'),
);

const fixedIdGenerator = new FixedIdGenerator('order-1');

const orderService = new OrderService({
  clock: fixedClock,
  idGenerator: fixedIdGenerator,
});

const order = await orderService.createOrder(input);

expect(order).toMatchObject({
  id: 'order-1',
  createdAt: new Date('2026-07-15T00:00:00.000Z'),
});
```

핵심은 동적인 값을 무조건 무시하는 것이 아니다.

시간과 ID가 비즈니스 규칙에 중요하다면 고정해서 정확하게 검증하고, 중요하지 않다면 타입이나 존재 여부만 확인한다.

중요하지 않은 표현상의 차이로 실패하는 테스트는 False Positive를 만든다.

---

## 7. 비동기 작업을 기다리지 않아 잘못 통과하는 테스트

좋지 않은 예:

```ts
it('존재하지 않는 사용자는 오류를 발생시킨다', () => {
  expect(userService.findById('missing-user')).rejects.toThrow(
    'User not found',
  );
});
```

`rejects`를 기다리지 않았기 때문에 테스트가 비동기 검증이 끝나기 전에 종료될 수 있다.

좋은 예:

```ts
it('존재하지 않는 사용자는 오류를 발생시킨다', async () => {
  await expect(
    userService.findById('missing-user'),
  ).rejects.toThrow('User not found');
});
```

콜백 기반 테스트에서도 완료 신호를 누락하면 동일한 문제가 발생한다.

좋지 않은 예:

```ts
it('이벤트를 처리한다', () => {
  eventBus.subscribe(event => {
    expect(event.type).toBe('ORDER_CREATED');
  });

  eventBus.publish(orderCreatedEvent);
});
```

콜백이 실행되지 않아도 테스트가 통과할 수 있다.

좋은 예:

```ts
it('주문 생성 이벤트를 구독자에게 전달한다', async () => {
  const receivedEvent = new Promise<OrderCreatedEvent>(resolve => {
    eventBus.subscribe(resolve);
  });

  await eventBus.publish(orderCreatedEvent);

  await expect(receivedEvent).resolves.toMatchObject({
    type: 'ORDER_CREATED',
    orderId: 'order-1',
  });
});
```

---

## 8. 프로덕션 코드와 같은 로직으로 기대값을 계산하는 테스트

좋지 않은 예:

```ts
it('주문 총액을 계산한다', () => {
  const items = [
    { price: 10_000, quantity: 2 },
    { price: 5_000, quantity: 1 },
  ];

  const expected = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  expect(calculateOrderTotal(items)).toBe(expected);
});
```

프로덕션 코드와 테스트 코드가 같은 계산 방식을 사용하면 둘 다 동일하게 잘못될 수 있다.

예를 들어 요구사항이 “상품별 금액을 계산한 뒤 10원 단위로 절사한다”인데 양쪽 모두 절사 규칙을 누락하면 테스트는 통과한다.

좋은 예:

```ts
it('상품 가격과 수량을 반영해 주문 총액을 계산한다', () => {
  const items = [
    { price: 10_000, quantity: 2 },
    { price: 5_000, quantity: 1 },
  ];

  expect(calculateOrderTotal(items)).toBe(25_000);
});
```

경계값은 표 형태로 명시할 수 있다.

```ts
it.each([
  {
    name: '상품이 없으면 0원',
    items: [],
    expected: 0,
  },
  {
    name: '단일 상품의 가격과 수량을 곱한다',
    items: [{ price: 10_000, quantity: 2 }],
    expected: 20_000,
  },
  {
    name: '여러 상품의 금액을 합산한다',
    items: [
      { price: 10_000, quantity: 2 },
      { price: 5_000, quantity: 1 },
    ],
    expected: 25_000,
  },
])('$name', ({ items, expected }) => {
  expect(calculateOrderTotal(items)).toBe(expected);
});
```

기대값은 가능하면 구현 로직이 아니라 요구사항에서 직접 도출해야 한다.

---

## 9. 구현 로직을 테스트에 복사하는 테스트

좋지 않은 예:

```ts
it('활성 사용자를 가입일순으로 반환한다', () => {
  const expected = users
    .filter(user => user.status === 'ACTIVE')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  expect(findActiveUsers(users)).toEqual(expected);
});
```

테스트가 프로덕션 코드의 재구현이 되어 있다. 필터 조건이나 정렬 방향을 양쪽에서 동일하게 잘못 작성하면 결함을 발견하지 못한다.

좋은 예:

```ts
it('활성 사용자만 오래된 가입일순으로 반환한다', () => {
  const users = [
    {
      id: 'user-1',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-01'),
    },
    {
      id: 'user-2',
      status: 'INACTIVE',
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'user-3',
      status: 'ACTIVE',
      createdAt: new Date('2026-02-01'),
    },
  ];

  const result = findActiveUsers(users);

  expect(result.map(user => user.id)).toEqual([
    'user-3',
    'user-1',
  ]);
});
```

입력과 기대 결과가 작고 명시적이면 테스트 자체가 비즈니스 규칙의 예시가 된다.

---

## 10. 거대한 스냅샷에 의존하는 테스트

좋지 않은 예:

```ts
it('상품 상세 정보를 반환한다', async () => {
  const response = await productService.getProductDetail('product-1');

  expect(response).toMatchSnapshot();
});
```

스냅샷이 수백 줄이라면 개발자는 변경 내용을 정확히 검토하지 않고 업데이트할 가능성이 높다.

```bash
vitest -u
```

이렇게 스냅샷을 갱신하는 순간 테스트는 결함을 탐지하는 장치가 아니라 현재 출력을 저장하는 장치가 된다.

좋은 예:

```ts
it('상품 상세 정보에 가격과 판매 상태를 포함한다', async () => {
  const product = await productService.getProductDetail('product-1');

  expect(product).toMatchObject({
    id: 'product-1',
    name: 'Keyboard',
    price: 100_000,
    saleStatus: 'ON_SALE',
  });

  expect(product.options).toHaveLength(2);
});
```

스냅샷은 다음처럼 결과 전체가 하나의 안정적인 계약인 경우에는 유효할 수 있다.

- 컴파일러 출력
    
- 코드 포매터 결과
    
- 직렬화 포맷
    
- 이메일 템플릿
    
- 작은 UI 컴포넌트
    
- 마이그레이션 전후의 구조 비교
    

이 경우에도 스냅샷은 사람이 실제로 검토할 수 있는 크기를 유지해야 한다.

---

## 11. 커버리지를 높이기 위해 실행만 하는 테스트

좋지 않은 예:

```ts
it('사용자 서비스 메서드를 실행한다', async () => {
  userRepository.findById.mockResolvedValue(mockUser);

  await userService.findById('user-1');
});
```

검증문이 없으므로 코드가 어떤 결과를 반환하든 통과한다.

다음 테스트도 크게 다르지 않다.

```ts
it('할인 계산 분기를 실행한다', () => {
  expect(() => calculateDiscount(order)).not.toThrow();
});
```

함수가 잘못된 할인 금액을 반환해도 예외만 발생하지 않으면 통과한다.

좋은 예:

```ts
it('VIP 회원에게 주문 금액의 10%를 할인한다', () => {
  const discount = calculateDiscount({
    customerGrade: 'VIP',
    totalPrice: 100_000,
  });

  expect(discount).toBe(10_000);
});
```

### 커버리지의 올바른 역할

커버리지는 테스트 품질의 증명이 아니라 **검증되지 않은 영역을 찾는 지도**다.

100% 라인 커버리지를 달성해도 다음은 보장되지 않는다.

- 결과가 정확한가
    
- 경계값이 검증됐는가
    
- 조건식이 반대로 작성되지 않았는가
    
- 중요한 분기가 실제 요구사항대로 동작하는가
    
- 예외 상황이 올바르게 처리되는가
    

테스트가 의미 있는지 확인하려면 다음 질문이 유용하다.

> 프로덕션 코드의 조건식을 반대로 바꾸거나 반환값을 잘못 바꾸면 이 테스트가 실패하는가?

실제 결함을 삽입해도 테스트가 계속 통과한다면 커버리지와 무관하게 테스트 가치가 낮다.

---

## 12. 시간, 난수, 실행 환경에 의존하는 테스트

좋지 않은 예:

```ts
it('쿠폰이 만료됐는지 확인한다', () => {
  const coupon = {
    expiresAt: new Date('2026-07-15T10:00:00'),
  };

  expect(isExpired(coupon)).toBe(false);
});
```

실행 시점에 따라 통과와 실패가 달라진다.

좋은 예:

```ts
it('현재 시간이 만료 시간을 지나면 만료된 쿠폰이다', () => {
  const clock = new FixedClock(
    new Date('2026-07-15T11:00:00'),
  );

  const coupon = {
    expiresAt: new Date('2026-07-15T10:00:00'),
  };

  expect(isExpired(coupon, clock)).toBe(true);
});
```

난수도 동일하다.

좋지 않은 예:

```ts
it('인증 코드를 생성한다', () => {
  const code = generateVerificationCode();

  expect(code).toBe('123456');
});
```

좋은 예:

```ts
it('6자리 인증 코드를 생성한다', () => {
  const random = new FixedRandomGenerator(0.123456);

  const code = generateVerificationCode(random);

  expect(code).toBe('123456');
});
```

시간, 난수, UUID처럼 비결정적인 값은 주입 가능한 의존성으로 만들면 테스트가 안정적이고 명확해진다.

---

## 13. 고정된 `sleep`으로 비동기 처리를 기다리는 테스트

좋지 않은 예:

```ts
it('작업이 완료되면 상태를 DONE으로 변경한다', async () => {
  await jobService.start('job-1');

  await sleep(1000);

  const job = await jobRepository.findById('job-1');

  expect(job.status).toBe('DONE');
});
```

작업이 1초보다 빠르면 불필요하게 느리고, 1초보다 느리면 간헐적으로 실패한다.

좋은 예:

```ts
it('작업이 완료되면 상태를 DONE으로 변경한다', async () => {
  await jobService.start('job-1');

  await waitFor(async () => {
    const job = await jobRepository.findById('job-1');

    expect(job.status).toBe('DONE');
  });
});
```

타이머 기반 코드라면 가짜 타이머를 사용할 수 있다.

```ts
it('5초 후 재시도한다', async () => {
  vi.useFakeTimers();

  const retryPromise = retryService.execute(task);

  await vi.advanceTimersByTimeAsync(5000);

  await retryPromise;

  expect(task).toHaveBeenCalledTimes(2);
});
```

고정 대기 대신 다음 중 하나를 사용한다.

- 완료 조건을 기다린다.
    
- 이벤트를 기다린다.
    
- Promise를 직접 기다린다.
    
- 가짜 타이머를 사용한다.
    
- 작업 큐를 테스트에서 직접 실행한다.
    

---

## 14. 테스트 간 상태를 공유하는 테스트

좋지 않은 예:

```ts
const repository = new InMemoryUserRepository();

it('사용자를 생성한다', async () => {
  await repository.save({
    id: 'user-1',
    email: 'user@example.com',
  });

  expect(await repository.count()).toBe(1);
});

it('중복 이메일은 거부한다', async () => {
  await expect(
    repository.save({
      id: 'user-2',
      email: 'user@example.com',
    }),
  ).rejects.toThrow('Duplicate email');
});
```

두 번째 테스트는 첫 번째 테스트가 먼저 실행돼야만 통과한다.

테스트 실행 순서를 바꾸거나 단독 실행하면 실패한다.

좋은 예:

```ts
describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  it('사용자를 생성한다', async () => {
    await repository.save({
      id: 'user-1',
      email: 'user@example.com',
    });

    expect(await repository.count()).toBe(1);
  });

  it('중복 이메일은 거부한다', async () => {
    await repository.save({
      id: 'user-1',
      email: 'user@example.com',
    });

    await expect(
      repository.save({
        id: 'user-2',
        email: 'user@example.com',
      }),
    ).rejects.toThrow('Duplicate email');
  });
});
```

각 테스트는 실행 순서와 관계없이 독립적으로 통과해야 한다.

공유 상태 문제는 다음에서도 자주 발생한다.

- 전역 배열
    
- 싱글턴 인스턴스
    
- 초기화되지 않은 mock 호출 기록
    
- 테스트 DB 데이터
    
- 환경 변수
    
- 가짜 타이머
    
- 캐시
    
- 파일 시스템
    

---

## 15. 하나의 테스트에서 너무 많은 기능을 검증하는 테스트

좋지 않은 예:

```ts
it('주문 전체 기능이 정상 동작한다', async () => {
  const order = await orderService.createOrder(input);
  expect(order.status).toBe('PENDING');

  await paymentService.pay(order.id);
  expect(await orderService.findById(order.id))
    .toMatchObject({ status: 'PAID' });

  await shippingService.start(order.id);
  expect(await orderService.findById(order.id))
    .toMatchObject({ status: 'SHIPPING' });

  await orderService.cancel(order.id);
  expect(await orderService.findById(order.id))
    .toMatchObject({ status: 'CANCELLED' });

  expect(emailSender.send).toHaveBeenCalled();
  expect(eventBus.publish).toHaveBeenCalledTimes(4);
});
```

이 테스트는 여러 정책과 상태 전이를 한꺼번에 검증한다.

실패했을 때 어느 규칙이 깨졌는지 빠르게 파악하기 어렵고, 하나의 작은 변경에도 전체 테스트가 영향을 받는다.

더 나은 예:

```ts
describe('주문 상태 변경', () => {
  it('결제가 완료되면 주문 상태가 PAID가 된다', async () => {
    const order = await givenPendingOrder();

    await paymentService.pay(order.id);

    await expectOrderStatus(order.id, 'PAID');
  });

  it('배송이 시작되면 주문 상태가 SHIPPING이 된다', async () => {
    const order = await givenPaidOrder();

    await shippingService.start(order.id);

    await expectOrderStatus(order.id, 'SHIPPING');
  });

  it('이미 배송 중인 주문은 취소할 수 없다', async () => {
    const order = await givenShippingOrder();

    await expect(
      orderService.cancel(order.id),
    ).rejects.toThrow('Shipping order cannot be cancelled');
  });
});
```

다만 테스트가 크다는 이유만으로 나쁜 것은 아니다.

사용자 관점의 전체 시나리오를 검증하는 블랙박스 테스트는 여러 컴포넌트를 통과할 수 있다.

```ts
it('고객이 상품을 주문하고 결제를 완료한다', async () => {
  const orderResponse = await request(app)
    .post('/orders')
    .send({
      productId: 'product-1',
      quantity: 2,
    })
    .expect(201);

  await request(app)
    .post(`/orders/${orderResponse.body.id}/payments`)
    .send({
      paymentMethod: 'CARD',
    })
    .expect(200);

  const order = await request(app)
    .get(`/orders/${orderResponse.body.id}`)
    .expect(200);

  expect(order.body).toMatchObject({
    status: 'PAID',
    totalPrice: 20_000,
  });
});
```

이 테스트는 범위는 크지만 내부 메서드 구성에는 관심이 없다. 기능 전체가 사용자 관점에서 동작하는지를 검증하므로 리팩터링 내성이 높다.

문제가 되는 것은 테스트의 크기 자체가 아니라 다음과 같은 구조다.

- 여러 독립적인 요구사항을 한 테스트에 섞는다.
    
- 실패 원인을 특정하기 어렵다.
    
- 내부 호출을 지나치게 많이 검증한다.
    
- 테스트 준비 과정이 실제 검증보다 크다.
    
- 하나의 변경으로 무관한 검증까지 모두 실패한다.
    

---

## 16. 테스트를 지나치게 잘게 쪼개는 경우

좋지 않은 예:

```ts
it('주문 ID가 존재한다', async () => {
  const order = await orderService.createOrder(input);

  expect(order.id).toBeDefined();
});

it('주문 상태가 PENDING이다', async () => {
  const order = await orderService.createOrder(input);

  expect(order.status).toBe('PENDING');
});

it('주문 가격이 존재한다', async () => {
  const order = await orderService.createOrder(input);

  expect(order.totalPrice).toBeDefined();
});
```

동일한 시나리오를 여러 번 실행하면서 관련된 결과를 인위적으로 분리했다.

좋은 예:

```ts
it('주문 생성 시 ID, 최종 금액, 초기 상태를 반환한다', async () => {
  const order = await orderService.createOrder(input);

  expect(order).toMatchObject({
    id: expect.any(String),
    totalPrice: 20_000,
    status: 'PENDING',
  });
});
```

하나의 비즈니스 동작에서 함께 보장돼야 하는 결과라면 하나의 테스트에서 검증해도 된다.

테스트 하나에는 assertion이 하나만 있어야 한다는 규칙은 절대적이지 않다.

더 적절한 기준은 다음과 같다.

> 하나의 테스트는 하나의 동작 또는 하나의 시나리오를 설명해야 한다.

---

## 17. 테스트를 통과시키기 위해 프로덕션 코드를 변경하는 경우

좋지 않은 예:

```ts
export class TokenService {
  createToken(userId: string) {
    if (process.env.NODE_ENV === 'test') {
      return 'fixed-test-token';
    }

    return crypto.randomUUID();
  }
}
```

테스트 환경에서만 다른 동작을 하므로 실제 프로덕션 코드를 테스트하지 않는다.

좋은 예:

```ts
interface TokenGenerator {
  generate(): string;
}

export class TokenService {
  constructor(
    private readonly tokenGenerator: TokenGenerator,
  ) {}

  createToken(userId: string) {
    return {
      userId,
      token: this.tokenGenerator.generate(),
    };
  }
}
```

테스트에서는 결정적인 생성기를 주입한다.

```ts
const tokenService = new TokenService({
  generate: () => 'fixed-test-token',
});

expect(tokenService.createToken('user-1')).toEqual({
  userId: 'user-1',
  token: 'fixed-test-token',
});
```

프로덕션 코드에 테스트 전용 조건문을 넣기보다, 비결정적인 의존성을 명시적으로 분리한다.

---

## 18. 잘못된 테스트 계층을 선택하는 경우

모든 테스트를 단위 테스트로 만들거나 모든 테스트를 E2E로 만드는 것은 효율적이지 않다.

### 단위 테스트에 적합한 대상

- 가격 계산
    
- 할인 규칙
    
- 상태 전이
    
- 값 객체 검증
    
- 파싱 및 변환
    
- 정렬과 필터링
    
- 권한 판단
    
- 날짜 계산
    

### 통합 테스트에 적합한 대상

- ORM 매핑
    
- 실제 SQL 쿼리
    
- 트랜잭션
    
- 데이터베이스 제약조건
    
- 캐시 연동
    
- 메시지 직렬화
    
- 프레임워크 설정
    
- 외부 API 어댑터
    

### E2E 테스트에 적합한 대상

- 회원가입
    
- 로그인
    
- 주문 생성과 결제
    
- 권한별 API 접근
    
- 주요 사용자 시나리오
    
- 여러 컴포넌트를 거치는 핵심 기능
    

좋지 않은 예:

```ts
it('Repository가 where 조건으로 ORM을 호출한다', async () => {
  await repository.findActiveUsers();

  expect(orm.user.findMany).toHaveBeenCalledWith({
    where: {
      status: 'ACTIVE',
    },
  });
});
```

이 테스트는 실제 ORM 쿼리가 올바르게 실행되는지 확인하지 못한다. ORM 호출 형태만 고정한다.

좋은 예:

```ts
it('활성 상태의 사용자만 조회한다', async () => {
  await database.user.createMany({
    data: [
      {
        id: 'user-1',
        status: 'ACTIVE',
      },
      {
        id: 'user-2',
        status: 'INACTIVE',
      },
    ],
  });

  const users = await repository.findActiveUsers();

  expect(users.map(user => user.id)).toEqual(['user-1']);
});
```

ORM, 데이터베이스, SQL의 실제 동작이 중요한 부분은 실제 데이터베이스 또는 호환성이 높은 테스트 데이터베이스로 검증하는 편이 낫다.

---

## 19. 오류 종류를 구분하지 못하는 테스트

좋지 않은 예:

```ts
it('잘못된 주문은 실패한다', async () => {
  await expect(
    orderService.createOrder(invalidInput),
  ).rejects.toThrow();
});
```

DB 연결 오류, `TypeError`, 잘못된 의존성 설정으로 실패해도 테스트가 통과한다.

좋은 예:

```ts
it('수량이 0이면 주문을 생성할 수 없다', async () => {
  await expect(
    orderService.createOrder({
      productId: 'product-1',
      quantity: 0,
    }),
  ).rejects.toMatchObject({
    code: 'INVALID_ORDER_QUANTITY',
  });
});
```

에러 메시지 전체는 문구 변경에 취약할 수 있으므로 안정적인 에러 코드나 타입을 검증하는 편이 좋다.

```ts
await expect(
  orderService.createOrder(invalidInput),
).rejects.toBeInstanceOf(InvalidOrderQuantityError);
```

---

## 20. 모든 테스트 데이터를 의미 없는 기본값으로 채우는 경우

좋지 않은 예:

```ts
const user = {
  id: '1',
  email: 'test@test.com',
  name: 'test',
  age: 1,
  status: 'ACTIVE',
  grade: 'NORMAL',
  country: 'KR',
  marketingAgreed: false,
};
```

모든 테스트가 같은 기본 데이터를 사용하면 어떤 값이 해당 테스트에서 중요한지 알기 어렵다.

좋은 예:

```ts
const user = userFixture({
  grade: 'VIP',
});

const discount = calculateDiscount(user, 100_000);

expect(discount).toBe(10_000);
```

Fixture나 Builder에는 합리적인 기본값을 두되, 각 테스트에서 중요한 값은 명시적으로 드러낸다.

```ts
function userFixture(
  overrides: Partial<User> = {},
): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Kim',
    status: 'ACTIVE',
    grade: 'NORMAL',
    ...overrides,
  };
}
```

테스트 데이터는 단순한 준비물이 아니라 테스트가 설명하는 조건의 일부다.

---

# 구현 디테일 테스트가 필요한 경우

블랙박스 테스트를 우선하더라도 모든 구현 디테일 테스트를 금지할 필요는 없다.

다음과 같은 경우에는 내부 동작 자체가 요구사항일 수 있다.

## 외부 호출 횟수가 비용이나 정확성에 직접 영향을 미치는 경우

```ts
it('동일한 결제 요청을 PG사에 중복 전송하지 않는다', async () => {
  await Promise.all([
    paymentService.pay('order-1'),
    paymentService.pay('order-1'),
  ]);

  expect(paymentGateway.approve).toHaveBeenCalledOnce();
});
```

결제 승인 호출 횟수는 단순한 구현 세부 사항이 아니라 중복 결제를 막기 위한 요구사항이다.

## 호출 순서가 데이터 정합성에 영향을 미치는 경우

```ts
it('주문 저장이 성공한 뒤 이벤트를 발행한다', async () => {
  await orderService.createOrder(input);

  expect(orderRepository.save)
    .toHaveBeenCalledBefore(eventPublisher.publish);
});
```

다만 호출 순서가 정말 계약인지 확인해야 한다.

더 강한 테스트는 저장 실패 시 이벤트가 발행되지 않는다는 결과를 검증하는 것이다.

```ts
it('주문 저장에 실패하면 주문 생성 이벤트를 발행하지 않는다', async () => {
  orderRepository.save.mockRejectedValue(
    new Error('Database error'),
  );

  await expect(
    orderService.createOrder(input),
  ).rejects.toThrow('Database error');

  expect(eventPublisher.publish).not.toHaveBeenCalled();
});
```

## 알고리즘의 복잡도가 중요한 경우

대량 데이터를 처리하는 핵심 알고리즘은 결과뿐 아니라 성능 특성이 요구사항일 수 있다.

다만 실행 시간을 정확히 밀리초 단위로 고정하면 환경에 따라 불안정해질 수 있다.

가능하면 다음을 검증한다.

- 외부 조회 횟수
    
- 반복 횟수가 비정상적으로 증가하지 않는 구조
    
- 쿼리 개수
    
- 처리 가능한 최대 데이터 크기
    
- 별도의 벤치마크 테스트
    

## 직렬화 형식이 외부 계약인 경우

메시지 큐 이벤트, 파일 포맷, 서명 문자열처럼 형식 자체가 외부 계약이면 세부 구조를 정확하게 검증해야 한다.

```ts
it('결제 이벤트를 계약된 메시지 형식으로 직렬화한다', () => {
  expect(serializePaymentEvent(event)).toEqual({
    version: '1',
    eventType: 'PAYMENT_COMPLETED',
    aggregateId: 'order-1',
    occurredAt: '2026-07-15T00:00:00.000Z',
    payload: {
      paymentId: 'payment-1',
      amount: 20_000,
    },
  });
});
```

여기서는 필드명과 구조가 단순한 구현 디테일이 아니라 외부 소비자와의 계약이다.

---

# 테스트 리뷰 시 확인할 기준

테스트를 리뷰할 때 다음 질문으로 실효성을 판단할 수 있다.

1. 이 테스트가 발견하려는 구체적인 결함은 무엇인가?
    
2. 프로덕션 코드에 실제 결함을 넣으면 테스트가 실패하는가?
    
3. 외부 동작을 유지한 채 내부 구조만 바꾸면 계속 통과하는가?
    
4. 테스트가 결과보다 mock 호출을 더 많이 검증하고 있지는 않은가?
    
5. 실제 도메인 로직까지 전부 mock으로 대체하지 않았는가?
    
6. 테스트가 프로덕션 로직을 그대로 복사하고 있지는 않은가?
    
7. 시간, 난수, 실행 순서, 네트워크 상태에 따라 결과가 달라지지 않는가?
    
8. 테스트 실패 메시지만 보고 깨진 요구사항을 파악할 수 있는가?
    
9. 커버리지를 위해 실행만 하고 의미 있는 검증을 생략하지 않았는가?
    
10. 이 테스트는 현재 선택할 수 있는 가장 적절한 계층에 있는가?
    

특히 다음 질문이 가장 중요하다.

> **내부 구현을 완전히 다르게 바꾸더라도 동일한 입력에 동일한 결과를 제공한다면 이 테스트는 통과해야 하는가?**

대답이 “그렇다”인데 테스트가 실패한다면 구현 디테일에 지나치게 결합됐을 가능성이 높다.

# 최종 원칙

테스트 코드 역시 프로덕션 코드와 마찬가지로 유지보수 대상이다.

테스트가 많다는 사실보다 중요한 것은 다음 세 가지다.

> **중요한 결함을 잡는가, 리팩터링을 방해하지 않는가, 실패했을 때 원인을 명확히 알려주는가.**

커버리지는 이 세 가지를 달성하기 위한 보조 지표일 뿐이다.

좋은 테스트는 프로덕션 코드의 현재 모양을 보존하지 않는다. 대신 시스템이 반드시 지켜야 하는 동작과 계약을 보존한다.