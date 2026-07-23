<!-- 원본: personal-dev-vault/프롬프트/ACID 가이드.md (2026-07-23 복사). 원본을 고치면 이 파일도 갱신할 것. -->
# 실용적인 ACID와 트랜잭션 설계 원칙

ACID는 데이터베이스에 `transaction`을 사용하면 자동으로 얻어지는 마법 같은 안전장치가 아니다.

> **ACID의 목적은 장애와 동시 요청이 발생하더라도 데이터가 비즈니스적으로 유효한 상태를 유지하도록 만드는 것이다.**

좋은 트랜잭션 설계는 다음 질문에 답할 수 있어야 한다.

- 작업 중간에 실패하면 어떤 변경이 남는가
    
- 같은 요청이 동시에 들어오면 결과가 어떻게 되는가
    
- 동일한 요청이 재시도되면 중복 처리가 발생하지 않는가
    
- 데이터베이스 변경과 외부 API 호출 사이에 불일치가 생기지 않는가
    
- 트랜잭션이 오래 유지되면서 다른 요청을 막지는 않는가
    
- 커밋 성공 후 데이터가 실제로 안전하게 보존되는가
    
- 장애 복구 후에도 비즈니스 불변 조건이 유지되는가
    

ACID는 다음 네 가지 성질을 의미한다.

- **Atomicity**: 작업이 전부 성공하거나 전부 실패한다.
    
- **Consistency**: 작업 전후에 데이터의 유효한 규칙이 유지된다.
    
- **Isolation**: 동시에 실행되는 작업이 서로의 중간 상태를 부적절하게 침범하지 않는다.
    
- **Durability**: 성공적으로 커밋된 변경은 장애가 발생해도 보존된다.
    

이 네 가지는 서로 독립적인 체크박스가 아니다. 실제 시스템에서는 트랜잭션 경계, 격리 수준, 데이터베이스 제약조건, 재시도 정책, 외부 시스템 연동 방식이 함께 맞아야 한다.

---

# ACID를 이해하기 전에 구분해야 할 개념

## 비즈니스 작업과 데이터베이스 트랜잭션은 다르다

사용자가 보는 하나의 작업이 반드시 하나의 데이터베이스 트랜잭션으로 끝나지는 않는다.

예를 들어 주문 결제는 다음 작업을 포함할 수 있다.

- 주문 생성
    
- 재고 차감
    
- 결제사 승인
    
- 결제 결과 저장
    
- 주문 상태 변경
    
- 이메일 발송
    
- 이벤트 발행
    
- 배송 요청
    

이 중 데이터베이스 내부 변경은 하나의 트랜잭션으로 묶을 수 있지만, 결제사 API나 메일 발송은 데이터베이스 트랜잭션에 포함되지 않는다.

```text
데이터베이스 트랜잭션 성공
≠
전체 비즈니스 작업 성공
```

따라서 다음 두 종류의 원자성을 구분해야 한다.

- **데이터베이스 원자성**: 하나의 데이터베이스 안에서 변경이 모두 성공하거나 모두 롤백된다.
    
- **비즈니스 원자성**: 데이터베이스, 결제사, 메시지 브로커 등 여러 시스템을 거치는 작업이 전체적으로 일관된 결과를 만든다.
    

ACID는 기본적으로 전자를 보장한다. 후자는 상태 머신, 멱등성, Outbox, 보상 트랜잭션 같은 별도 설계가 필요하다.

## 불변 조건을 먼저 정의한다

트랜잭션을 설계하기 전에 시스템이 반드시 지켜야 할 규칙을 정의해야 한다.

예를 들어 주문 시스템의 불변 조건은 다음과 같을 수 있다.

- 재고는 0보다 작아질 수 없다.
    
- 같은 결제 요청이 두 번 승인되어서는 안 된다.
    
- 결제 완료 주문에는 결제 기록이 반드시 존재해야 한다.
    
- 취소된 주문은 배송 중 상태가 될 수 없다.
    
- 하나의 이메일 주소로 활성 계정이 두 개 존재할 수 없다.
    
- 계좌 이체 전후의 전체 금액 합계는 변하지 않아야 한다.
    

ACID는 불변 조건을 자동으로 만들어주지 않는다.

> **어떤 상태가 유효한지 애플리케이션과 데이터베이스가 명시해야 ACID가 그 상태를 보호할 수 있다.**

---

# 1. Atomicity — 원자성

원자성은 하나의 트랜잭션에 포함된 작업이 전부 반영되거나 전부 취소되는 성질이다.

> **중간까지만 반영된 상태를 외부에 남기지 않는다.**

## 관련된 쓰기를 따로 실행하는 경우

좋지 않은 예:

```ts
async function createOrder(
  input: CreateOrderInput,
): Promise<Order> {
  const order = await prisma.order.create({
    data: {
      productId: input.productId,
      quantity: input.quantity,
      status: 'PENDING',
    },
  });

  await prisma.product.update({
    where: {
      id: input.productId,
    },
    data: {
      stock: {
        decrement: input.quantity,
      },
    },
  });

  return order;
}
```

주문 생성 후 재고 차감에서 오류가 발생하면 다음 상태가 남는다.

- 주문은 생성됐다.
    
- 재고는 차감되지 않았다.
    

재시도하면 주문이 중복 생성될 수도 있다.

좋은 예:

```ts
async function createOrder(
  input: CreateOrderInput,
): Promise<Order> {
  return prisma.$transaction(async tx => {
    const updated = await tx.product.updateMany({
      where: {
        id: input.productId,
        stock: {
          gte: input.quantity,
        },
      },
      data: {
        stock: {
          decrement: input.quantity,
        },
      },
    });

    if (updated.count === 0) {
      throw new InsufficientStockError(
        input.productId,
        input.quantity,
      );
    }

    return tx.order.create({
      data: {
        productId: input.productId,
        quantity: input.quantity,
        status: 'PENDING',
      },
    });
  });
}
```

재고 차감과 주문 생성을 하나의 트랜잭션으로 묶었다.

둘 중 하나가 실패하면 전체 작업이 롤백된다.

또한 단순히 재고를 조회한 뒤 차감하지 않고, 조건부 `UPDATE`를 사용해 동시 요청에서도 재고가 음수가 되지 않도록 했다.

---

## `try-catch`가 원자성을 보장하지는 않는다

좋지 않은 예:

```ts
async function transferMoney(
  sourceId: string,
  destinationId: string,
  amount: number,
): Promise<void> {
  try {
    await accountRepository.withdraw(
      sourceId,
      amount,
    );

    await accountRepository.deposit(
      destinationId,
      amount,
    );
  } catch (error) {
    logger.error(error);
  }
}
```

`try-catch`는 예외를 처리할 뿐 이미 반영된 데이터베이스 변경을 자동으로 되돌리지 않는다.

출금 후 입금에서 실패하면 돈이 사라진 상태가 남을 수 있다.

좋은 예:

```ts
async function transferMoney(
  sourceId: string,
  destinationId: string,
  amount: Money,
): Promise<void> {
  await transactionManager.execute(async tx => {
    const source =
      await tx.accounts.findByIdForUpdate(
        sourceId,
      );

    const destination =
      await tx.accounts.findByIdForUpdate(
        destinationId,
      );

    if (!source || !destination) {
      throw new AccountNotFoundError();
    }

    source.withdraw(amount);
    destination.deposit(amount);

    await tx.accounts.save(source);
    await tx.accounts.save(destination);
  });
}
```

출금과 입금을 하나의 데이터베이스 트랜잭션으로 묶는다.

예외가 발생하면 둘 다 반영되지 않는다.

---

## 예외를 삼키면 트랜잭션이 커밋될 수 있다

좋지 않은 예:

```ts
await prisma.$transaction(async tx => {
  try {
    await tx.order.create({
      data: orderData,
    });

    await tx.inventory.update({
      where: {
        productId,
      },
      data: {
        quantity: {
          decrement: orderQuantity,
        },
      },
    });
  } catch (error) {
    logger.error(error);

    return {
      success: false,
    };
  }
});
```

트랜잭션 콜백 안에서 예외를 잡은 뒤 다시 던지지 않으면 ORM은 콜백이 정상 종료됐다고 판단할 수 있다.

그 결과 예외 발생 전까지의 변경이 커밋될 수 있다.

좋은 예:

```ts
try {
  await prisma.$transaction(async tx => {
    await tx.order.create({
      data: orderData,
    });

    await tx.inventory.update({
      where: {
        productId,
      },
      data: {
        quantity: {
          decrement: orderQuantity,
        },
      },
    });
  });
} catch (error) {
  logger.error(error);

  throw new OrderCreationFailedError({
    cause: error,
  });
}
```

트랜잭션 안에서는 롤백돼야 하는 오류를 외부로 전파한다.

오류 변환과 로깅은 트랜잭션 바깥에서 수행하는 편이 안전하다.

---

## 데이터베이스 롤백은 외부 API 호출을 되돌리지 못한다

좋지 않은 예:

```ts
await prisma.$transaction(async tx => {
  const order = await tx.order.create({
    data: orderData,
  });

  await paymentGateway.approve({
    orderId: order.id,
    amount: order.totalPrice,
  });

  await tx.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: 'PAID',
    },
  });
});
```

결제 승인 후 데이터베이스 업데이트가 실패하면 트랜잭션은 롤백되지만 결제는 이미 승인됐다.

결과:

- 데이터베이스에는 주문이 없거나 결제 대기 상태다.
    
- 결제사에는 실제 결제가 존재한다.
    

반대로 데이터베이스 트랜잭션을 오래 열어둔 채 결제 API를 기다리면 락이 장시간 유지될 수 있다.

좋은 접근:

```ts
async function requestPayment(
  command: RequestPaymentCommand,
): Promise<void> {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({
      where: {
        id: command.orderId,
      },
    });

    if (!order) {
      throw new OrderNotFoundError(
        command.orderId,
      );
    }

    await tx.payment.create({
      data: {
        orderId: order.id,
        idempotencyKey:
          command.idempotencyKey,
        amount: order.totalPrice,
        status: 'PENDING',
      },
    });

    await tx.outboxMessage.create({
      data: {
        type: 'PAYMENT_APPROVAL_REQUESTED',
        aggregateId: order.id,
        payload: {
          orderId: order.id,
          amount: order.totalPrice,
          idempotencyKey:
            command.idempotencyKey,
        },
      },
    });
  });
}
```

별도 작업자가 Outbox 메시지를 읽고 결제사 API를 호출한다.

```ts
async function processPaymentApproval(
  message: PaymentApprovalRequested,
): Promise<void> {
  const approval =
    await paymentGateway.approve({
      orderId: message.orderId,
      amount: message.amount,
      idempotencyKey:
        message.idempotencyKey,
    });

  await prisma.$transaction(async tx => {
    const updated =
      await tx.payment.updateMany({
        where: {
          idempotencyKey:
            message.idempotencyKey,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          providerPaymentId:
            approval.paymentId,
        },
      });

    if (updated.count === 0) {
      return;
    }

    await tx.order.update({
      where: {
        id: message.orderId,
      },
      data: {
        status: 'PAID',
      },
    });

    await tx.outboxMessage.create({
      data: {
        type: 'PAYMENT_COMPLETED',
        aggregateId: message.orderId,
        payload: {
          orderId: message.orderId,
          paymentId: approval.paymentId,
        },
      },
    });
  });
}
```

핵심은 다음과 같다.

- 데이터베이스 내부 상태 변경은 로컬 트랜잭션으로 보호한다.
    
- 외부 API 호출은 데이터베이스 트랜잭션 밖에서 수행한다.
    
- 외부 호출에는 멱등성 키를 사용한다.
    
- 처리 상태를 명시적으로 기록한다.
    
- 중복 메시지를 받아도 결과가 중복 반영되지 않게 한다.
    
- 실패한 작업은 재시도하거나 보상 처리한다.
    

---

## 트랜잭션 범위가 너무 작은 경우

좋지 않은 예:

```ts
await transactionManager.execute(async tx => {
  await tx.orders.save(order);
});

await transactionManager.execute(async tx => {
  await tx.inventory.decrease(
    productId,
    quantity,
  );
});
```

각각은 원자적이지만 비즈니스 작업 전체는 원자적이지 않다.

주문 저장과 재고 차감이 반드시 함께 성공해야 한다면 같은 트랜잭션에 있어야 한다.

## 트랜잭션 범위가 너무 큰 경우

좋지 않은 예:

```ts
await transactionManager.execute(async tx => {
  const order =
    await tx.orders.findByIdForUpdate(
      orderId,
    );

  const report =
    await reportGenerator.generate(order);

  await fileStorage.upload(
    report.filename,
    report.content,
  );

  await emailSender.send({
    recipient: order.customerEmail,
    attachment: report,
  });

  order.markReportSent();

  await tx.orders.save(order);
});
```

보고서 생성, 파일 업로드, 이메일 발송 동안 데이터베이스 트랜잭션과 락이 유지된다.

이로 인해 다음 문제가 생길 수 있다.

- 락 대기 시간 증가
    
- 데드락 가능성 증가
    
- 데이터베이스 연결 고갈
    
- 외부 API 지연이 DB 성능에 전파
    
- 트랜잭션 실패 후 이미 발송된 이메일을 되돌릴 수 없음
    

더 나은 방향:

1. 트랜잭션 안에서 필요한 상태와 작업 요청을 저장한다.
    
2. 트랜잭션을 종료한다.
    
3. 별도 작업자가 보고서 생성과 발송을 수행한다.
    
4. 성공 또는 실패 상태를 다시 기록한다.
    

> **트랜잭션 안에는 데이터 정합성을 유지하는 데 필요한 최소한의 데이터베이스 작업만 둔다.**

---

# 2. Consistency — 일관성

ACID의 Consistency는 흔히 읽기 복제본의 지연이나 최종적 일관성과 혼동된다.

ACID에서 말하는 일관성은 다음 의미다.

> **트랜잭션 전후에 데이터가 정의된 불변 조건을 만족해야 한다.**

원자성이 모든 변경을 함께 반영한다고 해서 결과가 올바른 것은 아니다.

다음 작업은 원자적으로 성공할 수 있지만 비즈니스적으로 잘못됐다.

```ts
await prisma.$transaction(async tx => {
  await tx.account.update({
    where: {
      id: accountId,
    },
    data: {
      balance: -100_000,
    },
  });
});
```

트랜잭션은 정상 커밋됐지만 잔액이 음수가 될 수 없다는 불변 조건을 위반했다.

일관성은 다음 계층이 함께 지켜야 한다.

- 도메인 객체
    
- 애플리케이션 서비스
    
- 데이터베이스 제약조건
    
- 트랜잭션
    
- 동시성 제어
    
- 외부 시스템과의 상태 전이
    

---

## 애플리케이션 검증만 믿는 경우

좋지 않은 예:

```ts
const existingUser =
  await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

if (existingUser) {
  throw new EmailAlreadyRegisteredError(
    input.email,
  );
}

await prisma.user.create({
  data: {
    email: input.email,
  },
});
```

두 요청이 동시에 실행되면 다음 순서가 가능하다.

1. 요청 A가 사용자를 조회한다. 없음.
    
2. 요청 B가 사용자를 조회한다. 없음.
    
3. 요청 A가 사용자를 생성한다.
    
4. 요청 B도 사용자를 생성한다.
    

애플리케이션 검증은 사용자 친화적인 오류를 만드는 데 유용하지만 동시 요청까지 완전히 막지 못한다.

좋은 설계:

```sql
CREATE UNIQUE INDEX users_email_unique
ON users (email);
```

애플리케이션:

```ts
try {
  await prisma.user.create({
    data: {
      email: input.email,
    },
  });
} catch (error) {
  if (isUniqueConstraintViolation(error)) {
    throw new EmailAlreadyRegisteredError(
      input.email,
    );
  }

  throw error;
}
```

애플리케이션에서는 의도를 검증하고, 데이터베이스 제약조건은 최종 방어선 역할을 한다.

---

## 데이터베이스 제약조건을 적극적으로 사용한다

다음과 같은 규칙은 가능한 한 데이터베이스에도 표현하는 것이 좋다.

### 필수 값

```sql
ALTER TABLE orders
ALTER COLUMN customer_id SET NOT NULL;
```

### 참조 무결성

```sql
ALTER TABLE orders
ADD CONSTRAINT orders_customer_fk
FOREIGN KEY (customer_id)
REFERENCES customers (id);
```

### 고유성

```sql
CREATE UNIQUE INDEX payments_provider_id_unique
ON payments (provider_payment_id);
```

### 값 범위

```sql
ALTER TABLE products
ADD CONSTRAINT products_stock_non_negative
CHECK (stock >= 0);
```

### 복합 고유성

```sql
CREATE UNIQUE INDEX active_subscription_unique
ON subscriptions (user_id, product_id)
WHERE status = 'ACTIVE';
```

데이터베이스 제약조건의 장점은 모든 쓰기 경로에 적용된다는 것이다.

- API 서버
    
- 배치 작업
    
- 관리자 도구
    
- 마이그레이션 스크립트
    
- 직접 실행한 SQL
    
- 다른 서비스
    

애플리케이션 검증만 존재하면 우회 경로에서 잘못된 데이터가 들어갈 수 있다.

---

## 데이터베이스 제약조건만으로 모든 규칙을 표현할 필요는 없다

다음과 같은 복잡한 규칙은 애플리케이션 도메인 계층에서 관리하는 편이 명확할 수 있다.

- 주문 취소 가능 여부
    
- 회원 등급별 할인 규칙
    
- 배송 상태 전이
    
- 특정 시점 이후 환불 가능 여부
    
- 여러 외부 시스템 상태를 함께 판단하는 규칙
    

예:

```ts
class Order {
  cancel(cancelledAt: Date): void {
    if (
      this.status === 'SHIPPING' ||
      this.status === 'COMPLETED'
    ) {
      throw new OrderCannotBeCancelledError({
        orderId: this.id,
        status: this.status,
      });
    }

    if (cancelledAt > this.cancellableUntil) {
      throw new OrderCancellationPeriodExpiredError(
        this.id,
      );
    }

    this.status = 'CANCELLED';
    this.cancelledAt = cancelledAt;
  }
}
```

실용적인 기준은 다음과 같다.

> **데이터베이스가 직접 표현할 수 있는 구조적 불변 조건은 DB 제약조건으로 보호하고, 비즈니스 의미와 상태 전이는 도메인 코드에서 보호한다.**

중요한 규칙은 두 계층에서 중복 검증될 수 있다.

이는 제거해야 할 단순 코드 중복이 아니라 서로 다른 실패 지점을 방어하는 **다층 방어**다.

---

## 금액을 부동소수점으로 저장하는 경우

좋지 않은 예:

```ts
const totalPrice =
  product.price * quantity * 0.1;
```

`number`의 부동소수점 오차는 금액 계산에서 예기치 않은 결과를 만들 수 있다.

```ts
0.1 + 0.2 !== 0.3;
```

더 나은 방향:

```ts
class Money {
  private constructor(
    readonly amountInMinorUnit: bigint,
  ) {}

  static fromWon(amount: bigint): Money {
    return new Money(amount);
  }

  add(other: Money): Money {
    return new Money(
      this.amountInMinorUnit +
        other.amountInMinorUnit,
    );
  }

  multiply(rate: number): Money {
    const result = Math.round(
      Number(this.amountInMinorUnit) * rate,
    );

    return new Money(BigInt(result));
  }
}
```

또는 데이터베이스의 정확한 십진수 타입을 사용하고 반올림 규칙을 명시한다.

중요한 것은 자료형 자체보다 다음이다.

- 최소 화폐 단위
    
- 반올림 시점
    
- 반올림 방식
    
- 세금 계산 순서
    
- 할인 적용 순서
    
- 통화별 소수점 자릿수
    

금액 계산의 일관성은 트랜잭션만으로 보장되지 않는다.

---

## 상태를 직접 대입해 불변 조건을 우회하는 경우

좋지 않은 예:

```ts
order.status = 'COMPLETED';
```

어떤 상태에서 완료될 수 있는지, 결제가 존재하는지, 배송이 끝났는지 확인하지 않는다.

좋은 예:

```ts
class Order {
  complete(completedAt: Date): void {
    if (this.status !== 'DELIVERED') {
      throw new OrderCannotBeCompletedError({
        orderId: this.id,
        status: this.status,
      });
    }

    this.status = 'COMPLETED';
    this.completedAt = completedAt;
  }
}
```

데이터베이스 트랜잭션은 상태 변경을 원자적으로 반영한다.

도메인 객체는 그 상태 변경이 유효한지 판단한다.

---

# 3. Isolation — 격리성

격리성은 동시에 실행되는 트랜잭션이 서로의 작업에 의해 비정상적인 결과를 만들지 않도록 하는 성질이다.

> **동시 실행의 결과가 시스템이 허용하는 범위 안에서 순차 실행과 같은 의미를 가져야 한다.**

트랜잭션을 사용했다고 해서 모든 경쟁 상태가 자동으로 사라지는 것은 아니다.

격리 수준에 따라 허용되는 동시성 이상 현상이 다르다.

대표적인 문제는 다음과 같다.

- Dirty Read
    
- Non-repeatable Read
    
- Phantom Read
    
- Lost Update
    
- Write Skew
    

데이터베이스마다 격리 수준의 구체적인 동작이 다를 수 있으므로 이름만 보고 보장 범위를 추측해서는 안 된다.

---

## Dirty Read — 커밋되지 않은 값을 읽는 문제

트랜잭션 A:

```text
잔액을 100만 원에서 0원으로 변경
아직 커밋하지 않음
```

트랜잭션 B:

```text
잔액 0원을 읽고 출금을 거부
```

이후 트랜잭션 A가 롤백되면 실제 잔액은 다시 100만 원이다.

트랜잭션 B는 존재하지 않았던 중간 상태를 보고 판단했다.

대부분의 일반적인 데이터베이스 설정은 커밋되지 않은 읽기를 막지만, 시스템이 사용하는 격리 수준과 데이터 소스를 반드시 확인해야 한다.

---

## Non-repeatable Read — 같은 행을 다시 읽었을 때 값이 달라지는 문제

트랜잭션 A:

```text
주문 상태를 PAID로 읽음
```

트랜잭션 B:

```text
주문 상태를 CANCELLED로 변경하고 커밋
```

트랜잭션 A:

```text
같은 주문을 다시 읽으니 CANCELLED
```

한 트랜잭션 안에서 동일한 행의 값이 달라졌다.

이 현상이 문제가 되는지는 유스케이스에 따라 다르다.

단순 조회 화면에서는 허용될 수 있지만, 첫 번째 조회 결과를 기준으로 중요한 결정을 내린다면 추가 보호가 필요하다.

---

## Phantom Read — 조건에 맞는 행 집합이 달라지는 문제

트랜잭션 A:

```text
사용자의 활성 구독 수를 조회: 0개
```

트랜잭션 B:

```text
새 활성 구독을 생성하고 커밋
```

트랜잭션 A:

```text
활성 구독 수를 다시 조회: 1개
```

같은 조건으로 조회했지만 결과 행 집합이 달라졌다.

활성 구독이 하나만 존재해야 한다면 단순 조회 후 생성보다 데이터베이스 고유 제약조건으로 보호하는 편이 안전하다.

---

## Lost Update — 마지막 쓰기가 이전 쓰기를 덮는 문제

초기 재고가 10개라고 가정한다.

요청 A:

```text
재고 10개 조회
2개 차감 계산
8개 저장
```

요청 B:

```text
재고 10개 조회
3개 차감 계산
7개 저장
```

최종 재고는 5개가 되어야 하지만 마지막 저장에 따라 7개 또는 8개가 된다.

좋지 않은 예:

```ts
const product =
  await prisma.product.findUniqueOrThrow({
    where: {
      id: productId,
    },
  });

if (product.stock < quantity) {
  throw new InsufficientStockError();
}

await prisma.product.update({
  where: {
    id: productId,
  },
  data: {
    stock: product.stock - quantity,
  },
});
```

조회와 갱신 사이에 다른 요청이 값을 변경할 수 있다.

### 해결 방법 1: 원자적 조건부 갱신

```ts
const updated =
  await prisma.product.updateMany({
    where: {
      id: productId,
      stock: {
        gte: quantity,
      },
    },
    data: {
      stock: {
        decrement: quantity,
      },
    },
  });

if (updated.count === 0) {
  throw new InsufficientStockError();
}
```

단일 SQL문이 조건 확인과 갱신을 수행한다.

가능하다면 읽기-수정-쓰기보다 원자적 SQL 연산을 우선한다.

### 해결 방법 2: 비관적 락

```ts
await transactionManager.execute(async tx => {
  const product =
    await tx.products.findByIdForUpdate(
      productId,
    );

  if (!product) {
    throw new ProductNotFoundError(
      productId,
    );
  }

  product.decreaseStock(quantity);

  await tx.products.save(product);
});
```

한 트랜잭션이 행을 수정하는 동안 다른 트랜잭션이 해당 행을 변경하지 못하게 한다.

비관적 락은 다음과 같은 경우 적합하다.

- 충돌 가능성이 높다.
    
- 충돌이 발생하면 재시도 비용이 크다.
    
- 짧은 시간 안에 작업을 끝낼 수 있다.
    
- 동일한 행을 여러 요청이 자주 수정한다.
    

### 해결 방법 3: 낙관적 락

테이블:

```text
id
stock
version
```

조회 결과:

```ts
const product = {
  id: 'product-1',
  stock: 10,
  version: 4,
};
```

갱신:

```ts
const updated =
  await prisma.product.updateMany({
    where: {
      id: product.id,
      version: product.version,
    },
    data: {
      stock: product.stock - quantity,
      version: {
        increment: 1,
      },
    },
  });

if (updated.count === 0) {
  throw new ConcurrentModificationError(
    product.id,
  );
}
```

다른 요청이 먼저 수정했다면 `version`이 달라져 갱신에 실패한다.

낙관적 락은 다음과 같은 경우 적합하다.

- 충돌 가능성이 낮다.
    
- 읽기 작업이 많다.
    
- 락을 오래 유지하기 어렵다.
    
- 충돌 시 재시도하거나 사용자에게 갱신 충돌을 알릴 수 있다.
    

---

## Write Skew — 서로 다른 행을 수정하면서 규칙이 깨지는 문제

두 명의 당직 의사 중 최소 한 명은 반드시 근무해야 한다고 가정한다.

초기 상태:

```text
의사 A: 근무 중
의사 B: 근무 중
```

트랜잭션 A:

```text
근무 중인 다른 의사가 있는지 조회
의사 B가 있으므로 의사 A를 근무 해제
```

트랜잭션 B:

```text
근무 중인 다른 의사가 있는지 조회
의사 A가 있으므로 의사 B를 근무 해제
```

각 트랜잭션은 서로 다른 행을 수정한다.

둘 다 커밋되면 근무 중인 의사가 0명이 된다.

이 문제는 단순 행 락 하나로 해결되지 않을 수 있다.

해결 방향:

- 관련 행 집합을 명시적으로 잠근다.
    
- 불변 조건을 한 행으로 모델링한다.
    
- 직렬화 가능한 격리 수준을 사용한다.
    
- 데이터베이스에서 표현 가능한 제약조건으로 변경한다.
    
- 직렬화 실패를 재시도한다.
    

중요한 점은 다음이다.

> **격리 수준은 성능 옵션이 아니라 어떤 동시성 이상 현상을 허용할 것인지 결정하는 비즈니스 정확성 옵션이다.**

---

## 항상 가장 높은 격리 수준을 사용할 필요는 없다

직렬화 가능한 격리 수준은 강력하지만 비용이 있다.

- 동시 처리량 감소
    
- 충돌 증가
    
- 트랜잭션 재시도 증가
    
- 락 대기 증가
    
- 교착 상태 가능성 증가
    
- 복잡한 쿼리에서 예상하기 어려운 실패
    

단순한 조회와 독립적인 데이터 생성까지 모두 가장 강한 격리 수준으로 실행할 필요는 없다.

다음 순서로 판단하는 편이 좋다.

1. 지켜야 할 불변 조건을 정의한다.
    
2. 동시에 실행될 수 있는 작업을 찾는다.
    
3. 어떤 경쟁 상태가 발생할 수 있는지 분석한다.
    
4. 원자적 SQL과 DB 제약조건으로 해결 가능한지 본다.
    
5. 필요한 경우 락이나 높은 격리 수준을 사용한다.
    
6. 충돌 실패에 대한 재시도 정책을 만든다.
    

---

## 락을 일관되지 않은 순서로 획득하는 경우

트랜잭션 A:

```text
계좌 1 잠금
계좌 2 잠금 대기
```

트랜잭션 B:

```text
계좌 2 잠금
계좌 1 잠금 대기
```

두 트랜잭션이 서로를 기다리며 교착 상태가 발생한다.

좋은 예:

```ts
const [firstAccountId, secondAccountId] = [
  sourceAccountId,
  destinationAccountId,
].sort();

await transactionManager.execute(async tx => {
  const first =
    await tx.accounts.findByIdForUpdate(
      firstAccountId,
    );

  const second =
    await tx.accounts.findByIdForUpdate(
      secondAccountId,
    );

  // 실제 source와 destination 역할을 다시 매핑한다.
});
```

항상 동일한 순서로 락을 획득하면 교착 상태 가능성을 줄일 수 있다.

다만 데드락을 완전히 제거할 수 있다고 가정해서는 안 된다.

데이터베이스가 데드락을 감지하고 트랜잭션 하나를 중단할 수 있으므로, 재시도 가능한 작업은 적절히 재시도해야 한다.

---

## 트랜잭션 실패를 무조건 재시도하는 경우

좋지 않은 예:

```ts
async function executeWithRetry(
  operation: () => Promise<void>,
): Promise<void> {
  while (true) {
    try {
      await operation();
      return;
    } catch {
      // 모든 오류를 무한 재시도
    }
  }
}
```

다음 오류도 계속 재시도한다.

- 잘못된 입력
    
- 권한 없음
    
- 재고 부족
    
- 고유 제약조건 위반
    
- 프로그래밍 오류
    
- 영구적인 데이터 오류
    

좋은 예:

```ts
async function executeTransactionWithRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      const retryable =
        isSerializationFailure(error) ||
        isDeadlockError(error);

      if (
        !retryable ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      await sleep(
        calculateBackoffWithJitter(attempt),
      );
    }
  }

  throw new Error('Unreachable');
}
```

재시도는 다음 조건을 만족해야 한다.

- 재시도 가능한 오류만 대상으로 한다.
    
- 최대 횟수를 제한한다.
    
- 백오프와 지터를 사용한다.
    
- 작업 전체를 처음부터 다시 실행한다.
    
- 외부 부수 효과가 중복되지 않도록 멱등성을 확보한다.
    

---

# 4. Durability — 지속성

지속성은 트랜잭션이 성공적으로 커밋됐다고 응답한 뒤에는 서버 장애가 발생해도 해당 변경이 보존돼야 한다는 성질이다.

> **성공 응답을 받은 데이터가 갑자기 사라지지 않아야 한다.**

그러나 지속성은 다음을 의미하지 않는다.

- 데이터베이스가 항상 접속 가능하다.
    
- 데이터가 영원히 보존된다.
    
- 운영자의 실수로부터 자동 보호된다.
    
- 백업이 존재한다.
    
- 복제본에 즉시 반영된다.
    
- 다른 지역의 데이터센터에도 즉시 저장된다.
    
- 메시지 브로커나 외부 API에도 함께 반영된다.
    

지속성의 실제 수준은 데이터베이스와 인프라 설정에 따라 달라진다.

- 로그 플러시 정책
    
- 디스크 캐시
    
- 동기 또는 비동기 복제
    
- 다중 가용 영역 구성
    
- 스토리지 신뢰성
    
- 백업 정책
    
- 장애 복구 방식
    

---

## 커밋 전에 성공 응답을 보내는 경우

좋지 않은 예:

```ts
async function createOrderHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const promise = orderService.createOrder(
    request.body,
  );

  response.status(201).json({
    success: true,
  });

  await promise;
}
```

사용자는 성공 응답을 받았지만 데이터베이스 저장이 나중에 실패할 수 있다.

좋은 예:

```ts
async function createOrderHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const order =
    await orderService.createOrder(
      request.body,
    );

  response.status(201).json({
    id: order.id,
    status: order.status,
  });
}
```

최소한 비즈니스 작업에서 성공으로 간주하는 데이터베이스 커밋이 완료된 뒤 응답한다.

비동기 처리를 의도한다면 성공 완료가 아니라 작업 접수 상태를 반환해야 한다.

```ts
response.status(202).json({
  jobId,
  status: 'PENDING',
});
```

---

## 커밋된 데이터와 즉시 조회되는 데이터는 다를 수 있다

쓰기 직후 읽기를 복제본에서 수행하면 복제 지연으로 인해 방금 저장한 데이터가 보이지 않을 수 있다.

```ts
await primary.order.create({
  data: orderData,
});

const order =
  await readReplica.order.findUnique({
    where: {
      id: orderId,
    },
  });
```

결과가 `null`일 수 있다.

이는 커밋이 유실된 것이 아니라 읽기 복제본에 아직 반영되지 않은 것이다.

쓰기 직후 읽기 일관성이 필요하다면 다음 중 하나를 사용한다.

- 일정 시간 동안 Primary에서 읽는다.
    
- 세션 단위로 Read-your-writes를 보장한다.
    
- 복제 위치를 확인한 뒤 읽는다.
    
- 사용자에게 비동기 반영 상태를 명확히 보여준다.
    
- 캐시를 갱신하거나 무효화한다.
    

지속성과 읽기 일관성을 혼동해서는 안 된다.

---

## 데이터베이스 커밋과 메시지 발행 사이의 유실

좋지 않은 예:

```ts
const order = await prisma.order.create({
  data: orderData,
});

await eventBus.publish({
  type: 'ORDER_CREATED',
  orderId: order.id,
});
```

주문 저장 후 이벤트 발행 전에 프로세스가 종료되면 주문은 존재하지만 이벤트는 사라진다.

반대 순서도 안전하지 않다.

```ts
await eventBus.publish({
  type: 'ORDER_CREATED',
  orderId,
});

await prisma.order.create({
  data: orderData,
});
```

이벤트 발행 후 주문 저장이 실패하면 소비자는 존재하지 않는 주문 이벤트를 받는다.

좋은 예: Transactional Outbox

```ts
await prisma.$transaction(async tx => {
  const order = await tx.order.create({
    data: orderData,
  });

  await tx.outboxMessage.create({
    data: {
      type: 'ORDER_CREATED',
      aggregateId: order.id,
      payload: {
        orderId: order.id,
        customerId: order.customerId,
      },
    },
  });
});
```

별도 퍼블리셔가 Outbox를 읽어 메시지 브로커에 발행한다.

```ts
async function publishOutboxMessage(
  message: OutboxMessage,
): Promise<void> {
  await eventBus.publish({
    messageId: message.id,
    type: message.type,
    payload: message.payload,
  });

  await prisma.outboxMessage.update({
    where: {
      id: message.id,
    },
    data: {
      publishedAt: new Date(),
    },
  });
}
```

퍼블리셔가 발행 후 상태 갱신 전에 죽으면 같은 메시지가 다시 발행될 수 있다.

따라서 소비자는 중복 메시지를 처리할 수 있어야 한다.

```ts
await prisma.$transaction(async tx => {
  const processed =
    await tx.processedMessage.findUnique({
      where: {
        messageId: message.id,
      },
    });

  if (processed) {
    return;
  }

  await handleOrderCreated(tx, message);

  await tx.processedMessage.create({
    data: {
      messageId: message.id,
    },
  });
});
```

실무에서는 보통 다음 전달 보장을 목표로 한다.

- 메시지가 유실되지 않는다.
    
- 메시지는 한 번 이상 전달될 수 있다.
    
- 소비자는 중복 전달에 안전하다.
    

외부 시스템까지 포함한 정확히 한 번 처리는 매우 어렵기 때문에, 멱등한 한 번 이상 처리 방식이 현실적인 경우가 많다.

---

## 지속성을 백업으로 오해하는 경우

트랜잭션이 지속성을 보장하더라도 다음 상황에서는 데이터가 손실될 수 있다.

- 운영자가 잘못된 `DELETE`를 실행한다.
    
- 애플리케이션 버그가 정상 트랜잭션으로 데이터를 손상시킨다.
    
- 랜섬웨어나 계정 탈취로 데이터가 삭제된다.
    
- 스키마 마이그레이션이 잘못된다.
    
- 여러 복제본에 잘못된 변경이 정상 복제된다.
    

따라서 별도로 필요하다.

- 정기 백업
    
- 시점 복구
    
- 백업 암호화
    
- 별도 계정과 저장소
    
- 복원 절차
    
- 복원 훈련
    
- 복구 시간 목표
    
- 복구 시점 목표
    

> **백업이 존재하는 것과 실제로 복구할 수 있는 것은 다르다.**

복원 테스트를 하지 않은 백업은 검증되지 않은 가정이다.

---

# 트랜잭션과 외부 시스템

## 이메일 발송을 트랜잭션 안에서 실행하는 경우

좋지 않은 예:

```ts
await prisma.$transaction(async tx => {
  const user = await tx.user.create({
    data: userData,
  });

  await emailSender.sendWelcomeEmail(
    user.email,
  );
});
```

문제:

- 이메일 발송 동안 트랜잭션이 유지된다.
    
- 이메일은 발송됐지만 커밋이 실패할 수 있다.
    
- 재시도 시 이메일이 중복 발송될 수 있다.
    
- 메일 서버 장애가 사용자 생성까지 막는다.
    

더 나은 예:

```ts
await prisma.$transaction(async tx => {
  const user = await tx.user.create({
    data: userData,
  });

  await tx.outboxMessage.create({
    data: {
      type: 'WELCOME_EMAIL_REQUESTED',
      aggregateId: user.id,
      payload: {
        userId: user.id,
        email: user.email,
      },
    },
  });
});
```

이메일 발송은 비동기 작업자가 처리한다.

중복 발송이 문제라면 이메일 요청에 고유 키를 둔다.

```sql
CREATE UNIQUE INDEX welcome_email_once
ON notification_requests (
  user_id,
  notification_type
);
```

---

## 외부 API 호출을 먼저 한 뒤 DB 저장하는 경우

```ts
const approval =
  await paymentGateway.approve(request);

await prisma.payment.create({
  data: {
    providerPaymentId:
      approval.paymentId,
    status: 'APPROVED',
  },
});
```

DB 저장이 실패하면 결제는 승인됐지만 로컬 기록이 없다.

## DB 저장을 먼저 한 뒤 외부 API를 호출하는 경우

```ts
const payment =
  await prisma.payment.create({
    data: {
      status: 'APPROVED',
    },
  });

await paymentGateway.approve(request);
```

외부 결제에 실패했는데 로컬 DB에는 승인 상태가 남을 수 있다.

좋은 설계는 상태를 명시한다.

```text
PENDING
→ APPROVING
→ APPROVED

또는

PENDING
→ APPROVING
→ FAILED
```

예:

```ts
const payment =
  await prisma.payment.create({
    data: {
      idempotencyKey,
      orderId,
      status: 'PENDING',
    },
  });
```

외부 호출 성공 후:

```ts
await prisma.payment.updateMany({
  where: {
    id: payment.id,
    status: {
      in: ['PENDING', 'APPROVING'],
    },
  },
  data: {
    status: 'APPROVED',
    providerPaymentId,
  },
});
```

외부 시스템 연동에서는 하나의 거대한 원자성을 기대하지 말고, 중간 상태와 복구 경로를 모델링해야 한다.

---

# 멱등성 — 재시도 가능한 시스템의 핵심

네트워크 시스템에서는 요청 성공 여부를 호출자가 확실히 알지 못하는 경우가 있다.

```text
결제 요청 전송
→ 결제사 승인 성공
→ 응답 도중 네트워크 단절
```

호출자는 실패했다고 생각하지만 결제는 이미 승인됐다.

같은 요청을 다시 보내면 중복 결제가 발생할 수 있다.

## 요청 ID 없이 재시도하는 경우

좋지 않은 예:

```ts
await paymentService.pay({
  orderId,
  amount,
});
```

좋은 예:

```ts
await paymentService.pay({
  orderId,
  amount,
  idempotencyKey:
    request.headers['idempotency-key'],
});
```

데이터베이스:

```sql
CREATE UNIQUE INDEX payments_idempotency_key_unique
ON payments (idempotency_key);
```

처리:

```ts
async function pay(
  command: PayCommand,
): Promise<Payment> {
  const existing =
    await paymentRepository
      .findByIdempotencyKey(
        command.idempotencyKey,
      );

  if (existing) {
    return existing;
  }

  try {
    return await paymentRepository.create({
      orderId: command.orderId,
      amount: command.amount,
      idempotencyKey:
        command.idempotencyKey,
      status: 'PENDING',
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return paymentRepository
        .findByIdempotencyKeyOrThrow(
          command.idempotencyKey,
        );
    }

    throw error;
  }
}
```

조회 후 생성만으로는 동시 요청 경쟁을 완전히 막지 못하므로 고유 제약조건이 최종적으로 중복 생성을 방지해야 한다.

멱등성 키는 다음을 고려해야 한다.

- 같은 키에는 같은 요청 내용만 허용할 것인가
    
- 키 유효기간은 얼마인가
    
- 처리 중인 요청에 다시 접근하면 어떻게 응답할 것인가
    
- 실패한 요청을 같은 키로 재시도할 수 있는가
    
- 완료된 응답을 저장해 동일하게 반환할 것인가
    

---

# 트랜잭션 안티패턴

## 1. 모든 메서드에 트랜잭션을 붙인다

좋지 않은 예:

```ts
@Transactional()
async function findUser(
  id: string,
): Promise<User> {
  return userRepository.findByIdOrThrow(id);
}
```

단순 조회까지 무조건 트랜잭션으로 감싸면 다음 비용이 발생할 수 있다.

- 연결 점유
    
- 트랜잭션 관리 비용
    
- 불필요한 스냅샷 유지
    
- 락과 버전 정리 지연
    
- 코드상 실제 트랜잭션 경계 파악 어려움
    

트랜잭션은 의미 있는 일관성 경계를 기준으로 사용한다.

---

## 2. 저장소 메서드마다 독립 트랜잭션을 연다

좋지 않은 예:

```ts
class OrderRepository {
  async save(order: Order) {
    return prisma.$transaction(tx => {
      return tx.order.create({
        data: mapOrder(order),
      });
    });
  }
}

class InventoryRepository {
  async decrease(productId: string) {
    return prisma.$transaction(tx => {
      return tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stock: {
            decrement: 1,
          },
        },
      });
    });
  }
}
```

호출부:

```ts
await orderRepository.save(order);
await inventoryRepository.decrease(
  productId,
);
```

각 저장소 메서드는 원자적이지만 전체 유스케이스는 원자적이지 않다.

좋은 방향:

```ts
await transactionManager.execute(async tx => {
  await tx.orders.save(order);
  await tx.inventory.decrease(
    productId,
    quantity,
  );
});
```

트랜잭션 경계는 저장소가 아니라 유스케이스가 결정한다.

---

## 3. 컨트롤러 전체를 트랜잭션으로 감싼다

좋지 않은 예:

```ts
@Transactional()
async function createOrderController(
  request: Request,
  response: Response,
) {
  const parsed =
    await parseMultipartRequest(request);

  const image =
    await imageStorage.upload(
      parsed.receipt,
    );

  const order =
    await orderService.create({
      ...parsed.body,
      receiptUrl: image.url,
    });

  response.json(order);
}
```

HTTP 파싱과 파일 업로드까지 트랜잭션에 포함될 수 있다.

더 나은 경계:

```ts
async function createOrderController(
  request: Request,
  response: Response,
) {
  const command =
    createOrderSchema.parse(request.body);

  const order =
    await orderService.create(command);

  response.status(201).json(order);
}
```

서비스:

```ts
async function create(
  command: CreateOrderCommand,
): Promise<Order> {
  return transactionManager.execute(
    async tx => {
      // 정합성이 필요한 DB 작업만 수행
    },
  );
}
```

---

## 4. 트랜잭션 안에서 오래 걸리는 계산을 수행한다

좋지 않은 예:

```ts
await transactionManager.execute(async tx => {
  const records =
    await tx.analytics.findAll();

  const report =
    calculateComplexReport(records);

  await tx.reports.save(report);
});
```

복잡한 계산 동안 트랜잭션이 열려 있다.

더 나은 방향:

```ts
const records =
  await analyticsRepository.findSnapshot();

const report =
  calculateComplexReport(records);

await transactionManager.execute(async tx => {
  await tx.reports.save(report);
});
```

다만 계산 기준 시점의 데이터가 반드시 고정돼야 한다면 다음 중 하나가 필요하다.

- 스냅샷 격리
    
- 버전 번호
    
- 기준 시각 저장
    
- 별도의 집계 테이블
    
- 이벤트 기반 집계
    
- 읽기 전용 트랜잭션 안에서 스냅샷 확보
    

단순히 트랜잭션을 줄이는 것보다 요구되는 읽기 일관성을 먼저 정의해야 한다.

---

## 5. 하나의 거대한 배치를 한 트랜잭션으로 처리한다

좋지 않은 예:

```ts
await prisma.$transaction(async tx => {
  for (const user of oneMillionUsers) {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        migrated: true,
      },
    });
  }
});
```

문제:

- 트랜잭션 로그 증가
    
- 락 장시간 유지
    
- 실패 시 전체 재실행
    
- 데이터베이스 연결 장시간 점유
    
- 복제 지연 증가
    
- 장애 복구 비용 증가
    

더 나은 방향:

```ts
for (const batch of chunks(users, 1_000)) {
  await prisma.$transaction(async tx => {
    for (const user of batch) {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          migrated: true,
        },
      });
    }
  });
}
```

배치 작업에는 다음이 필요하다.

- 처리 단위
    
- 체크포인트
    
- 멱등성
    
- 재시도
    
- 실패 건 기록
    
- 진행률
    
- 부분 성공 정책
    
- 롤백 또는 보상 방식
    

전체 원자성이 반드시 필요한 마이그레이션인지, 안전하게 나눌 수 있는 작업인지 구분해야 한다.

---

## 6. 중첩 트랜잭션이 자동으로 하나가 된다고 가정한다

```ts
async function createOrder() {
  await transactionManager.execute(async () => {
    await reserveInventory();
  });
}

async function reserveInventory() {
  await transactionManager.execute(async () => {
    // ...
  });
}
```

프레임워크와 라이브러리에 따라 다음 중 하나가 될 수 있다.

- 같은 트랜잭션 재사용
    
- 별도 트랜잭션 생성
    
- Savepoint 생성
    
- 내부 트랜잭션 무시
    
- 오류 발생
    

내부 작업이 커밋됐는데 외부 작업이 롤백되는 등 예상과 다른 결과가 생길 수 있다.

트랜잭션 컨텍스트를 명시적으로 전달하는 편이 안전하다.

```ts
async function createOrder(): Promise<void> {
  await transactionManager.execute(async tx => {
    await reserveInventory(tx);
    await createOrderRecord(tx);
  });
}

async function reserveInventory(
  tx: TransactionContext,
): Promise<void> {
  // 전달받은 동일 트랜잭션 사용
}
```

---

## 7. `Promise.all`을 사용하면 트랜잭션 쿼리도 병렬이라고 가정한다

```ts
await prisma.$transaction(async tx => {
  await Promise.all([
    tx.order.create({
      data: orderData,
    }),
    tx.inventory.update({
      where: {
        id: productId,
      },
      data: inventoryData,
    }),
  ]);
});
```

하나의 트랜잭션은 일반적으로 하나의 연결에 묶인다.

`Promise.all`을 사용해도 실제 쿼리가 병렬로 실행되지 않을 수 있으며, ORM이나 드라이버에 따라 예측하기 어려운 동작이 발생할 수 있다.

또한 두 작업 사이에 순서 의존성이 있다면 병렬화 자체가 잘못이다.

트랜잭션 안에서는 성능을 추측해 병렬화하기보다 데이터 의존성과 드라이버 동작을 명확하게 확인해야 한다.

---

## 8. 분산 락으로 데이터베이스 제약조건을 대체한다

좋지 않은 접근:

```ts
await redisLock.acquire(
  `user-email:${email}`,
);

try {
  const existing =
    await userRepository.findByEmail(email);

  if (!existing) {
    await userRepository.create({
      email,
    });
  }
} finally {
  await redisLock.release(
    `user-email:${email}`,
  );
}
```

락 만료, 네트워크 분할, 프로세스 중단, 잘못된 락 구현으로 중복 데이터가 들어갈 수 있다.

이메일 고유성은 데이터베이스 고유 제약조건으로 보장해야 한다.

```sql
CREATE UNIQUE INDEX users_email_unique
ON users (email);
```

분산 락은 필요한 경우 보조 수단으로 사용할 수 있지만 데이터 무결성의 최종 방어선이 되어서는 안 된다.

---

# 단일 SQL문을 우선할 수 있는 경우

여러 단계의 읽기-수정-쓰기보다 하나의 원자적 SQL문이 더 안전하고 단순할 수 있다.

## 잔액 차감

좋지 않은 예:

```ts
const account =
  await accountRepository.findById(
    accountId,
  );

if (account.balance < amount) {
  throw new InsufficientBalanceError();
}

await accountRepository.updateBalance(
  accountId,
  account.balance - amount,
);
```

더 나은 예:

```sql
UPDATE accounts
SET balance = balance - :amount
WHERE id = :accountId
  AND balance >= :amount
RETURNING balance;
```

결과 행이 없다면 잔액 부족 또는 계좌 없음으로 판단한다.

## 작업 선점

좋지 않은 예:

```ts
const job =
  await jobRepository.findFirstPending();

if (!job) {
  return;
}

await jobRepository.markProcessing(job.id);
```

여러 작업자가 같은 작업을 가져갈 수 있다.

더 나은 방향:

```sql
SELECT id
FROM jobs
WHERE status = 'PENDING'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

그 뒤 같은 트랜잭션에서 처리 상태로 변경한다.

데이터베이스가 제공하는 원자적 연산과 락 기능을 잘 활용하면 애플리케이션 수준의 복잡한 동시성 코드를 줄일 수 있다.

---

# 트랜잭션 테스트 원칙

트랜잭션 코드는 mock만으로 충분히 검증하기 어렵다.

Mock은 다음을 실제로 검증하지 못한다.

- DB 제약조건
    
- 락 동작
    
- 격리 수준
    
- 데드락
    
- 동시성 충돌
    
- 실제 롤백
    
- ORM 쿼리 변환
    
- 트랜잭션 컨텍스트 전파
    
- 커넥션 풀 동작
    

## 호출 여부만 확인하는 테스트

좋지 않은 예:

```ts
it('트랜잭션을 사용한다', async () => {
  await orderService.createOrder(input);

  expect(
    transactionManager.execute,
  ).toHaveBeenCalled();
});
```

이 테스트는 트랜잭션 안에 어떤 작업이 포함됐는지, 실제 롤백이 되는지 검증하지 못한다.

좋은 예:

```ts
it(
  '재고 차감에 실패하면 주문도 저장하지 않는다',
  async () => {
    await productFixture.create({
      id: 'product-1',
      stock: 0,
    });

    await expect(
      orderService.createOrder({
        productId: 'product-1',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    const orders =
      await database.order.findMany();

    expect(orders).toHaveLength(0);

    const product =
      await database.product.findUniqueOrThrow({
        where: {
          id: 'product-1',
        },
      });

    expect(product.stock).toBe(0);
  },
);
```

실제 테스트 데이터베이스에서 최종 상태를 검증한다.

---

## 동시성 테스트를 순차 실행하는 경우

좋지 않은 예:

```ts
await orderService.createOrder(input);
await orderService.createOrder(input);
```

순차 실행은 경쟁 상태를 재현하지 못한다.

좋은 예:

```ts
it(
  '재고가 하나일 때 동시에 두 주문이 들어오면 하나만 성공한다',
  async () => {
    await productFixture.create({
      id: 'product-1',
      stock: 1,
    });

    const results =
      await Promise.allSettled([
        orderService.createOrder({
          productId: 'product-1',
          quantity: 1,
        }),
        orderService.createOrder({
          productId: 'product-1',
          quantity: 1,
        }),
      ]);

    const fulfilled =
      results.filter(
        result =>
          result.status === 'fulfilled',
      );

    const rejected =
      results.filter(
        result =>
          result.status === 'rejected',
      );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const product =
      await database.product.findUniqueOrThrow({
        where: {
          id: 'product-1',
        },
      });

    expect(product.stock).toBe(0);

    expect(
      await database.order.count(),
    ).toBe(1);
  },
);
```

실제 동시성 테스트에서는 별도 데이터베이스 연결이 사용되는지 확인해야 한다.

같은 연결이나 같은 트랜잭션을 공유하면 동시성 문제가 재현되지 않을 수 있다.

---

## 테스트마다 트랜잭션 롤백으로 데이터를 정리할 때의 주의점

테스트를 하나의 트랜잭션으로 감싸고 종료 시 롤백하는 방식은 빠르지만 다음 문제를 숨길 수 있다.

- 실제 커밋 이후 동작
    
- 별도 연결에서의 가시성
    
- Outbox 퍼블리셔 동작
    
- 커밋 훅
    
- 복제본 읽기
    
- 동시 트랜잭션
    
- 커넥션 풀 동작
    

단순 저장소 테스트에는 유용할 수 있지만 커밋 자체가 중요한 테스트는 실제로 커밋한 뒤 별도로 정리해야 한다.

---

# ACID가 보장하지 않는 것

## 비즈니스 로직의 정확성

다음 트랜잭션은 완벽히 ACID를 만족하면서도 잘못된 결과를 저장할 수 있다.

```ts
await prisma.$transaction(async tx => {
  await tx.order.update({
    where: {
      id: orderId,
    },
    data: {
      totalPrice: 0,
      status: 'COMPLETED',
    },
  });
});
```

ACID는 코드가 올바른 할인율과 상태 전이를 사용했는지 판단하지 않는다.

## 여러 시스템에 걸친 자동 원자성

데이터베이스와 다음 시스템은 하나의 일반적인 로컬 트랜잭션으로 묶이지 않는다.

- 결제사
    
- 이메일 서비스
    
- 메시지 브로커
    
- 검색 엔진
    
- 파일 저장소
    
- 다른 마이크로서비스
    
- 다른 데이터베이스
    

## 중복 요청 방지

클라이언트 재시도, 네트워크 재전송, 메시지 재전달로 같은 작업이 여러 번 호출될 수 있다.

ACID만으로 요청 멱등성이 생기지는 않는다.

## 가용성

데이터가 안전하게 보존돼도 데이터베이스 장애 중에는 서비스가 응답하지 못할 수 있다.

지속성과 가용성은 별개의 특성이다.

## 백업과 재해 복구

커밋된 데이터도 잘못된 삭제나 운영 실수로 손실될 수 있다.

백업과 복구 전략이 따로 필요하다.

## 읽기 복제본의 즉시 일관성

Primary에서 커밋된 변경이 Replica에 즉시 보이는 것은 별도 보장이다.

---

# 트랜잭션 설계의 실용적인 순서

## 1. 불변 조건을 정의한다

예:

```text
재고는 음수가 될 수 없다.
동일 주문에는 성공한 결제가 하나만 존재한다.
결제 완료 주문에는 승인된 결제 기록이 존재해야 한다.
```

## 2. 하나의 비즈니스 작업에 포함되는 변경을 나열한다

예:

```text
재고 차감
주문 생성
결제 요청 생성
이벤트 발행 요청 저장
```

## 3. 같은 데이터베이스에서 함께 성공해야 하는 작업을 묶는다

```text
재고 차감 + 주문 생성
```

## 4. 외부 시스템 작업을 분리한다

```text
결제 승인
메일 발송
메시지 브로커 발행
```

이 작업은 Outbox, 작업 큐, 상태 머신, 멱등성으로 처리한다.

## 5. 동시 실행 시나리오를 분석한다

- 같은 상품을 동시에 주문하면?
    
- 같은 결제를 두 번 요청하면?
    
- 주문 취소와 배송 시작이 동시에 일어나면?
    
- 같은 이메일로 동시에 가입하면?
    
- 같은 계좌에서 동시에 출금하면?
    

## 6. 가장 단순한 보호 수단부터 적용한다

우선순위의 일반적인 예:

1. 단일 원자적 SQL
    
2. DB 제약조건
    
3. 조건부 갱신
    
4. 낙관적 락
    
5. 비관적 락
    
6. 더 높은 격리 수준
    
7. 직렬화 실패 재시도
    
8. 분산 조정
    

항상 이 순서가 정답은 아니지만 복잡한 분산 락보다 데이터베이스가 제공하는 원자적 기능을 먼저 검토하는 편이 좋다.

## 7. 실패와 재시도 경로를 설계한다

- 어디서 실패할 수 있는가
    
- 실패하면 어떤 상태가 남는가
    
- 자동 재시도가 가능한가
    
- 중복 실행돼도 안전한가
    
- 보상 작업이 필요한가
    
- 사람이 개입해야 하는 상태가 있는가
    

---

# 코드 리뷰에서 확인할 질문

## 원자성

- 함께 성공하거나 실패해야 하는 데이터 변경이 같은 트랜잭션에 있는가?
    
- 트랜잭션 안에서 예외를 삼키고 있지는 않은가?
    
- 부분 커밋이 발생할 수 있는 경로가 있는가?
    
- 데이터베이스 롤백으로 외부 API까지 되돌릴 수 있다고 가정하지 않는가?
    
- 트랜잭션 범위가 너무 작거나 너무 크지 않은가?
    

## 일관성

- 이 작업이 반드시 지켜야 하는 불변 조건은 무엇인가?
    
- 애플리케이션 검증 외에 DB 제약조건이 필요한가?
    
- 여러 쓰기 경로가 동일한 규칙을 우회할 수 있지 않은가?
    
- 상태 변경이 도메인 규칙을 거치지 않고 직접 대입되고 있지 않은가?
    
- 금액, 시간, 단위, 반올림 규칙이 명확한가?
    

## 격리성

- 같은 요청이 동시에 실행되면 결과가 어떻게 되는가?
    
- 조회 후 갱신 사이에 다른 트랜잭션이 값을 변경할 수 있는가?
    
- Lost Update나 Write Skew가 발생할 수 있는가?
    
- 조건부 갱신이나 DB 제약조건으로 더 단순하게 해결할 수 있는가?
    
- 락을 일관된 순서로 획득하는가?
    
- 격리 실패와 데드락을 올바르게 재시도하는가?
    

## 지속성

- 실제 커밋이 완료되기 전에 성공 응답을 보내지 않는가?
    
- DB 커밋과 이벤트 발행 사이에 메시지 유실 가능성이 있는가?
    
- 쓰기 직후 복제본에서 읽으며 데이터 유실로 오해할 수 있지 않은가?
    
- 백업과 복원 절차가 실제로 검증돼 있는가?
    
- 장애 시 어느 시점까지의 데이터를 복구할 수 있는가?
    

## 외부 시스템

- 네트워크 호출을 DB 트랜잭션 안에서 실행하지 않는가?
    
- 외부 API 호출에 멱등성 키가 있는가?
    
- 중복 메시지를 안전하게 처리할 수 있는가?
    
- 중간 상태와 실패 상태가 명시적으로 모델링돼 있는가?
    
- 보상 작업 또는 운영자 복구 경로가 있는가?
    

## 테스트

- 실제 데이터베이스에서 롤백과 제약조건을 검증하는가?
    
- 동시에 실행되는 요청을 실제 별도 연결로 테스트하는가?
    
- Mock 호출 여부가 아니라 최종 데이터 상태를 검증하는가?
    
- 커밋 이후 동작을 테스트 트랜잭션 롤백이 숨기지 않는가?
    
- 재시도와 중복 요청 테스트가 존재하는가?
    

---

# ACID를 기계적으로 적용할 때 발생하는 문제

## 모든 작업을 하나의 거대한 트랜잭션에 넣는다

데이터 정합성을 높이려다 락, 지연, 연결 고갈, 외부 부수 효과 문제를 만든다.

## 항상 가장 높은 격리 수준을 사용한다

정확성은 높아질 수 있지만 불필요한 충돌과 재시도가 증가한다.

## 데이터베이스 제약조건 없이 서비스 코드만 믿는다

동시 요청이나 우회 쓰기 경로에서 불변 조건이 깨진다.

## 모든 경쟁 상태를 분산 락으로 해결한다

락 시스템 자체의 장애와 네트워크 분할 문제를 추가한다.

## 외부 API를 트랜잭션 안에 넣으면 함께 롤백된다고 생각한다

데이터베이스 롤백은 이미 처리된 결제, 이메일, 파일 업로드를 되돌리지 못한다.

## 메시지를 한 번만 받을 것이라고 가정한다

메시지 브로커와 네트워크에서는 중복 전달이 발생할 수 있다.

## 커버리지 높은 단위 테스트만으로 동시성을 검증했다고 생각한다

실제 데이터베이스의 락과 격리 동작은 Mock으로 검증할 수 없다.

---

# ACID의 실용적인 우선순위

데이터 변경 로직을 설계할 때 다음 순서가 유용하다.

1. 비즈니스 불변 조건
    
2. 데이터 손실과 중복 처리 방지
    
3. 데이터베이스 제약조건
    
4. 올바른 트랜잭션 경계
    
5. 동시성 이상 현상 방지
    
6. 실패와 재시도 설계
    
7. 외부 시스템과의 상태 일치
    
8. 운영 복구 가능성
    
9. 처리량과 지연 시간
    
10. 구현의 추상적 우아함
    

성능을 위해 정확성을 포기할 수는 없다.

하지만 실제로 충돌하지 않는 모든 작업을 가장 무거운 트랜잭션으로 처리하는 것도 좋은 설계는 아니다.

> **지켜야 할 불변 조건에 필요한 만큼만 강한 보장을 적용한다.**

---

# 최종 원칙

Atomicity는 모든 코드를 하나의 거대한 트랜잭션에 넣으라는 원칙이 아니다.

> 함께 성공하거나 실패해야 하는 데이터베이스 변경을 올바른 경계로 묶으라는 원칙이다.

Consistency는 데이터베이스가 자동으로 비즈니스 규칙을 이해한다는 의미가 아니다.

> 애플리케이션과 데이터베이스가 유효한 상태를 정의하고 그 불변 조건을 함께 보호하라는 원칙이다.

Isolation은 트랜잭션을 사용하면 모든 동시성 문제가 사라진다는 의미가 아니다.

> 동시에 실행되는 작업에서 어떤 이상 현상을 허용할지 판단하고 필요한 수준의 동시성 제어를 적용하라는 원칙이다.

Durability는 커밋된 데이터가 어떤 상황에서도 영원히 안전하다는 의미가 아니다.

> 성공으로 응답한 변경을 인프라 장애에도 보존하고, 별도로 백업과 복구 전략을 준비하라는 원칙이다.

ACID는 외부 시스템까지 자동으로 하나의 트랜잭션으로 만들어주지 않는다.

> 외부 API와 메시지 브로커가 포함되면 상태 머신, 멱등성, Outbox, 재시도, 보상 처리가 필요하다.

좋은 트랜잭션 설계는 트랜잭션을 많이 사용하는 설계가 아니다.

> **불변 조건을 명확히 정의하고, 필요한 데이터 변경만 짧은 트랜잭션으로 보호하며, 동시 실행과 실패 이후의 상태까지 예측할 수 있는 설계다.**