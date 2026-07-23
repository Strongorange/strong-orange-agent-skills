<!-- 원본: personal-dev-vault/프롬프트/SOLID 및 클린코드 가이드.md (2026-07-23 복사). 원본을 고치면 이 파일도 갱신할 것. -->
# 실용적인 SOLID와 클린 코드 원칙

SOLID와 클린 코드의 목적은 코드가 특정 모양을 갖추게 만드는 것이 아니다.

> **요구사항이 바뀌었을 때 변경 범위를 예측할 수 있고, 수정한 부분과 관계없는 기능이 함께 깨지지 않도록 만드는 것이 목적이다.**

좋은 설계는 클래스 수, 함수 길이, 인터페이스 개수로 평가할 수 없다.

다음 질문에 긍정적으로 답할 수 있는지가 더 중요하다.

- 변경해야 할 위치를 빠르게 찾을 수 있는가
    
- 하나의 변경이 여러 파일에 불필요하게 퍼지지 않는가
    
- 새로운 요구사항을 기존 코드를 크게 흔들지 않고 추가할 수 있는가
    
- 코드의 이름과 구조만으로 주요 비즈니스 규칙을 이해할 수 있는가
    
- 외부 시스템이나 프레임워크를 바꿨을 때 핵심 정책까지 영향을 받지 않는가
    
- 정상적인 리팩터링이 테스트를 대량으로 깨뜨리지 않는가
    

SOLID는 이 목표를 달성하기 위한 도구다. 모든 클래스에 다섯 가지 원칙을 기계적으로 적용하는 것은 오히려 코드의 이해 비용을 높일 수 있다.

---

# SOLID 원칙

## 1. SRP — 단일 책임 원칙

Single Responsibility Principle은 흔히 다음처럼 잘못 해석된다.

> 함수나 클래스는 하나의 일만 해야 한다.

이 설명은 지나치게 추상적이다. 실제로는 다음 의미에 가깝다.

> **하나의 모듈은 하나의 변경 이유를 가져야 한다.**

여기서 책임은 코드 줄 수나 메서드 개수가 아니라 **함께 변경되는 정책의 경계**를 의미한다.

## 여러 변경 이유가 섞인 서비스

좋지 않은 예:

```ts
class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mailer: Mailer,
  ) {}

  async createOrder(input: CreateOrderInput) {
    if (input.quantity <= 0) {
      throw new Error('Invalid quantity');
    }

    const product = await this.prisma.product.findUnique({
      where: {
        id: input.productId,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    let discount = 0;

    if (input.customerGrade === 'VIP') {
      discount = product.price * input.quantity * 0.1;
    }

    const totalPrice =
      product.price * input.quantity - discount;

    const order = await this.prisma.order.create({
      data: {
        productId: product.id,
        quantity: input.quantity,
        totalPrice,
        status: 'PENDING',
      },
    });

    const emailBody = `
      주문번호: ${order.id}
      주문금액: ${order.totalPrice}
    `;

    await this.mailer.send({
      recipient: input.customerEmail,
      subject: '주문이 완료되었습니다.',
      body: emailBody,
    });

    return order;
  }
}
```

이 클래스에는 서로 다른 변경 이유가 섞여 있다.

- 주문 수량 정책 변경
    
- 회원 등급별 할인 정책 변경
    
- 데이터베이스 저장 구조 변경
    
- 주문 확인 메일 템플릿 변경
    
- 메일 발송 시스템 변경
    

메일 문구 하나를 변경하기 위해 주문 생성 로직을 수정해야 하고, 할인 정책을 변경하기 위해 데이터베이스 코드가 있는 파일을 건드려야 한다.

더 나은 예:

```ts
interface OrderRepository {
  save(order: Order): Promise<void>;
}

interface OrderConfirmationSender {
  send(order: Order, recipient: string): Promise<void>;
}

class OrderCreator {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
    private readonly discountPolicy: DiscountPolicy,
    private readonly confirmationSender: OrderConfirmationSender,
  ) {}

  async execute(
    input: CreateOrderInput,
  ): Promise<Order> {
    const product =
      await this.productRepository.findById(input.productId);

    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const discount = this.discountPolicy.calculate({
      customerGrade: input.customerGrade,
      product,
      quantity: input.quantity,
    });

    const order = Order.create({
      product,
      quantity: input.quantity,
      discount,
    });

    await this.orderRepository.save(order);

    await this.confirmationSender.send(
      order,
      input.customerEmail,
    );

    return order;
  }
}
```

`OrderCreator`는 여전히 여러 협력 객체를 호출한다. 하지만 이것은 문제가 아니다.

이 클래스의 책임은 다음과 같이 명확하다.

> 주문 생성 유스케이스를 조율한다.

상품 조회, 주문 생성, 저장, 확인 메시지 전송은 주문 생성이라는 하나의 유스케이스 흐름에 속한다. 각 정책의 구체적인 구현만 별도 책임으로 분리했다.

## 과도하게 분리한 예

다음처럼 모든 한 줄을 클래스로 만드는 것은 SRP가 아니다.

```ts
class ProductFinder {}
class QuantityValidator {}
class DiscountCalculatorCaller {}
class OrderFactoryCaller {}
class OrderSaver {}
class ConfirmationSenderCaller {}
class OrderCreationCoordinator {}
```

코드를 읽기 위해 여러 파일을 오가야 하고, 전체 흐름을 한눈에 파악하기 어려워진다.

SRP는 클래스를 최대한 작게 만드는 원칙이 아니다.

> **서로 다른 이유로 변경되는 코드를 분리하되, 함께 이해해야 하는 흐름은 가까이 둔다.**

## SRP 적용이 필요한 신호

다음 상황이 반복되면 책임 분리를 검토할 가치가 있다.

- 하나의 파일이 서로 무관한 요구사항 때문에 자주 수정된다.
    
- 특정 기능을 변경할 때 관련 없는 테스트가 함께 깨진다.
    
- 클래스 이름이 `Manager`, `Helper`, `Processor`, `CommonService`처럼 지나치게 포괄적이다.
    
- 하나의 클래스가 데이터베이스, 도메인 정책, 출력 포맷, 외부 API를 모두 직접 다룬다.
    
- 여러 팀이나 담당자가 같은 파일을 서로 다른 목적으로 계속 수정한다.
    
- 설명할 때 “그리고”가 지나치게 많이 필요하다.
    

반대로 메서드가 여러 개 있다는 이유만으로 클래스를 분리할 필요는 없다. 해당 메서드들이 같은 정책과 같은 변경 이유를 공유한다면 하나의 책임일 수 있다.

---

## 2. OCP — 개방·폐쇄 원칙

Open-Closed Principle은 다음 의미다.

> **기존의 안정적인 코드를 계속 수정하지 않고도 새로운 동작을 추가할 수 있어야 한다.**

흔히 다음과 같이 과장된다.

> 모든 코드는 확장에는 열려 있고 수정에는 완전히 닫혀 있어야 한다.

현실적으로 요구사항이 변경되면 코드는 수정된다. OCP의 핵심은 **변화가 자주 발생하는 지점을 찾아 그 변화가 안정적인 정책으로 퍼지지 않게 하는 것**이다.

## 새로운 종류가 추가될 때마다 조건문이 퍼지는 코드

좋지 않은 예:

```ts
class PaymentService {
  async pay(
    method: PaymentMethod,
    amount: number,
  ): Promise<PaymentResult> {
    if (method === 'CARD') {
      return this.cardGateway.approve(amount);
    }

    if (method === 'KAKAO_PAY') {
      return this.kakaoPayGateway.approve(amount);
    }

    if (method === 'NAVER_PAY') {
      return this.naverPayGateway.approve(amount);
    }

    throw new UnsupportedPaymentMethodError(method);
  }

  async cancel(
    method: PaymentMethod,
    paymentId: string,
  ): Promise<void> {
    if (method === 'CARD') {
      await this.cardGateway.cancel(paymentId);
      return;
    }

    if (method === 'KAKAO_PAY') {
      await this.kakaoPayGateway.cancel(paymentId);
      return;
    }

    if (method === 'NAVER_PAY') {
      await this.naverPayGateway.cancel(paymentId);
      return;
    }

    throw new UnsupportedPaymentMethodError(method);
  }
}
```

결제 수단이 추가될 때마다 여러 조건문을 함께 수정해야 한다.

새로운 결제 수단을 한 곳에서 빠뜨리면 승인되지만 취소되지 않는 등의 결함이 발생할 수 있다.

더 나은 예:

```ts
interface PaymentProcessor {
  readonly method: PaymentMethod;

  pay(amount: number): Promise<PaymentResult>;

  cancel(paymentId: string): Promise<void>;
}

class CardPaymentProcessor
  implements PaymentProcessor
{
  readonly method = 'CARD' as const;

  constructor(
    private readonly gateway: CardGateway,
  ) {}

  pay(amount: number) {
    return this.gateway.approve(amount);
  }

  cancel(paymentId: string) {
    return this.gateway.cancel(paymentId);
  }
}

class PaymentService {
  private readonly processors: Map<
    PaymentMethod,
    PaymentProcessor
  >;

  constructor(processors: PaymentProcessor[]) {
    this.processors = new Map(
      processors.map(processor => [
        processor.method,
        processor,
      ]),
    );
  }

  private getProcessor(
    method: PaymentMethod,
  ): PaymentProcessor {
    const processor = this.processors.get(method);

    if (!processor) {
      throw new UnsupportedPaymentMethodError(method);
    }

    return processor;
  }

  pay(method: PaymentMethod, amount: number) {
    return this.getProcessor(method).pay(amount);
  }

  cancel(
    method: PaymentMethod,
    paymentId: string,
  ) {
    return this.getProcessor(method).cancel(paymentId);
  }
}
```

새로운 결제 수단을 추가할 때 기존 결제 서비스의 조건문을 여러 군데 수정하지 않아도 된다.

새로운 구현체를 추가하고 조립 지점에 등록하면 된다.

## 조건문이 항상 나쁜 것은 아니다

다음과 같이 경우의 수가 적고 안정적이라면 조건문이 더 명확할 수 있다.

```ts
function getOrderStatusLabel(
  status: OrderStatus,
): string {
  switch (status) {
    case 'PENDING':
      return '결제 대기';

    case 'PAID':
      return '결제 완료';

    case 'SHIPPING':
      return '배송 중';

    case 'COMPLETED':
      return '완료';

    case 'CANCELLED':
      return '취소';
  }
}
```

주문 상태가 도메인의 닫힌 집합이고 모든 상태를 한곳에서 확인하는 것이 중요하다면 `switch`가 오히려 명확하다.

다음 이유만으로 전략 패턴을 도입할 필요는 없다.

- 조건문이 존재한다.
    
- 경우의 수가 두 개다.
    
- 언젠가 종류가 늘어날 것 같다.
    
- 디자인 패턴을 적용할 수 있다.
    

OCP를 적용할 가치가 큰 경우는 다음과 같다.

- 새로운 유형이 반복적으로 추가된다.
    
- 유형 추가 때 여러 파일의 조건문을 함께 수정한다.
    
- 기능별로 서로 다른 팀이나 플러그인이 확장한다.
    
- 기존 유형을 수정하지 않고 독립적으로 배포해야 한다.
    
- 각 유형의 처리 방식이 충분히 복잡하고 독립적이다.
    

아직 하나의 구현밖에 없는데 플러그인 시스템, 레지스트리, 팩토리 계층까지 미리 만드는 것은 OCP가 아니라 추측에 기반한 과설계다.

---

## 3. LSP — 리스코프 치환 원칙

Liskov Substitution Principle은 다음 의미다.

> **상위 타입을 사용하는 코드는 어떤 하위 구현체를 받아도 계약대로 동작해야 한다.**

핵심은 상속 문법이 아니라 **행동 계약**이다.

구현체가 인터페이스의 메서드를 모두 가지고 있다고 해서 치환 가능한 것은 아니다.

## 지원하지 않는 기능을 예외로 처리하는 구현체

좋지 않은 예:

```ts
interface FileStorage {
  read(path: string): Promise<Buffer>;

  write(
    path: string,
    content: Buffer,
  ): Promise<void>;

  delete(path: string): Promise<void>;
}

class ReadOnlyStorage implements FileStorage {
  read(path: string): Promise<Buffer> {
    return this.client.read(path);
  }

  write(): Promise<void> {
    throw new Error('Not supported');
  }

  delete(): Promise<void> {
    throw new Error('Not supported');
  }
}
```

`FileStorage`를 사용하는 코드는 모든 저장소가 읽기, 쓰기, 삭제를 지원한다고 기대한다.

하지만 `ReadOnlyStorage`로 교체하면 런타임에 갑자기 실패한다.

이는 타입은 맞지만 계약은 지키지 못한 것이다.

더 나은 예:

```ts
interface FileReader {
  read(path: string): Promise<Buffer>;
}

interface FileWriter {
  write(
    path: string,
    content: Buffer,
  ): Promise<void>;
}

interface FileRemover {
  delete(path: string): Promise<void>;
}

class ReadOnlyStorage implements FileReader {
  read(path: string): Promise<Buffer> {
    return this.client.read(path);
  }
}

class WritableStorage
  implements FileReader, FileWriter, FileRemover
{
  read(path: string): Promise<Buffer> {
    return this.client.read(path);
  }

  write(
    path: string,
    content: Buffer,
  ): Promise<void> {
    return this.client.write(path, content);
  }

  delete(path: string): Promise<void> {
    return this.client.delete(path);
  }
}
```

이제 쓰기 기능이 필요한 코드는 `FileWriter`를 명시적으로 요구한다.

## 반환 계약을 바꾸는 구현체

좋지 않은 예:

```ts
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

class CachedUserRepository
  implements UserRepository
{
  async findById(id: string): Promise<User | null> {
    const user = await this.cache.get(id);

    if (!user) {
      throw new Error('Cache miss');
    }

    return user;
  }
}
```

인터페이스 계약은 사용자가 없으면 `null`을 반환하는 것이다.

그러나 캐시 구현은 데이터가 없을 때 예외를 던진다.

호출자는 저장소 구현을 교체했을 뿐인데 오류 처리 방식까지 바꿔야 한다.

더 나은 예:

```ts
class CachedUserRepository
  implements UserRepository
{
  constructor(
    private readonly cache: UserCache,
    private readonly origin: UserRepository,
  ) {}

  async findById(id: string): Promise<User | null> {
    const cachedUser = await this.cache.get(id);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.origin.findById(id);

    if (user) {
      await this.cache.set(user);
    }

    return user;
  }
}
```

캐시 미스는 내부 구현 세부 사항일 뿐이며, 외부 계약은 동일하게 유지된다.

## LSP에서 지켜야 하는 계약

구현체는 일반적으로 다음을 임의로 강화하거나 약화해서는 안 된다.

- 입력값의 허용 범위
    
- 반환값의 의미
    
- 오류가 발생하는 조건
    
- 부수 효과
    
- 데이터 정합성
    
- 호출 순서에 대한 요구
    
- 성공과 실패의 기준
    

예를 들어 인터페이스가 모든 양수를 허용하는데 특정 구현체만 100 이하의 값만 받는다면 입력 조건을 강화한 것이다.

인터페이스가 저장 성공 후 데이터를 즉시 조회할 수 있다고 약속하는데 특정 구현체만 몇 초 뒤에 반영된다면 일관성 계약이 달라진 것이다.

이 경우에는 억지로 같은 인터페이스에 넣기보다 계약 자체를 분리하거나 이름을 명확히 해야 한다.

---

## 4. ISP — 인터페이스 분리 원칙

Interface Segregation Principle은 다음 의미다.

> **사용자는 자신이 사용하지 않는 기능에 의존해서는 안 된다.**

인터페이스가 크면 구현체는 필요하지 않은 메서드까지 억지로 구현해야 하고, 사용자는 실제로 필요하지 않은 변경에도 영향을 받는다.

## 지나치게 큰 저장소 인터페이스

좋지 않은 예:

```ts
interface UserRepository {
  findById(id: string): Promise<User | null>;

  findAll(): Promise<User[]>;

  save(user: User): Promise<void>;

  delete(id: string): Promise<void>;

  count(): Promise<number>;

  exportCsv(): Promise<string>;

  restoreDeletedUser(id: string): Promise<void>;

  updateLastLoginAt(
    id: string,
    date: Date,
  ): Promise<void>;
}
```

사용자 조회만 필요한 서비스도 삭제, CSV 내보내기, 복구 기능에 의존한다.

테스트 대역을 만들 때도 사용하지 않는 메서드까지 모두 구현해야 한다.

```ts
const repository: UserRepository = {
  findById: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  exportCsv: vi.fn(),
  restoreDeletedUser: vi.fn(),
  updateLastLoginAt: vi.fn(),
};
```

더 나은 예:

```ts
interface UserReader {
  findById(id: string): Promise<User | null>;
}

interface UserWriter {
  save(user: User): Promise<void>;
}

interface UserRemover {
  delete(id: string): Promise<void>;
}

class UserProfileService {
  constructor(
    private readonly users: UserReader,
  ) {}
}

class UserRegistrationService {
  constructor(
    private readonly users: UserReader & UserWriter,
  ) {}
}
```

각 소비자가 실제로 필요한 계약에만 의존한다.

## 인터페이스를 메서드 하나씩 무조건 분리할 필요는 없다

다음처럼 관련된 기능은 하나의 계약으로 묶는 것이 더 자연스러울 수 있다.

```ts
interface OrderRepository {
  findById(id: string): Promise<Order | null>;

  save(order: Order): Promise<void>;
}
```

주문을 불러와 상태를 변경한 뒤 저장하는 기능에서 조회와 저장은 하나의 저장소 계약으로 이해할 수 있다.

ISP는 인터페이스를 최대한 작게 만드는 원칙이 아니다.

> **서로 다른 소비자가 서로 다른 이유로 필요로 하는 기능을 하나의 거대한 계약에 묶지 않는 원칙이다.**

인터페이스 분리가 필요한 신호는 다음과 같다.

- 구현체가 여러 메서드에서 `Not supported`를 던진다.
    
- 테스트 대역에 사용하지 않는 빈 메서드가 많다.
    
- 특정 소비자는 전체 인터페이스 중 일부만 사용한다.
    
- 인터페이스의 일부 변경 때문에 무관한 구현체가 수정된다.
    
- 읽기 전용, 쓰기 전용처럼 권한이나 능력이 실제로 다르다.
    

---

## 5. DIP — 의존성 역전 원칙

Dependency Inversion Principle은 다음 의미다.

> **핵심 정책은 구체적인 기술 구현이 아니라 자신이 필요로 하는 계약에 의존해야 한다.**

고수준 정책이 데이터베이스, 외부 API, 메일 SDK 같은 저수준 세부 사항을 직접 알면 기술 변경이 비즈니스 로직까지 침투한다.

## 핵심 로직이 ORM과 외부 SDK에 직접 의존하는 코드

좋지 않은 예:

```ts
class PasswordResetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly resend: Resend,
  ) {}

  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return;
    }

    const token = crypto.randomUUID();

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(
          Date.now() + 30 * 60 * 1000,
        ),
      },
    });

    await this.resend.emails.send({
      to: email,
      subject: '비밀번호 재설정',
      html: `<a href="/reset?token=${token}">재설정</a>`,
    });
  }
}
```

이 서비스는 다음 구체적인 기술을 직접 알고 있다.

- Prisma 쿼리 구조
    
- 토큰 생성 방식
    
- 현재 시간 조회 방식
    
- Resend SDK
    
- HTML 이메일 형식
    

데이터베이스나 메일 제공자를 교체하지 않더라도 테스트에서 실제 기술 의존성을 모두 처리해야 한다.

더 나은 예:

```ts
interface UserReader {
  findByEmail(email: string): Promise<User | null>;
}

interface PasswordResetTokenRepository {
  save(token: PasswordResetToken): Promise<void>;
}

interface PasswordResetNotifier {
  send(
    recipient: string,
    token: string,
  ): Promise<void>;
}

interface TokenGenerator {
  generate(): string;
}

interface Clock {
  now(): Date;
}

class PasswordResetRequester {
  constructor(
    private readonly users: UserReader,
    private readonly tokens:
      PasswordResetTokenRepository,
    private readonly notifier:
      PasswordResetNotifier,
    private readonly tokenGenerator:
      TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      return;
    }

    const token = PasswordResetToken.create({
      userId: user.id,
      value: this.tokenGenerator.generate(),
      createdAt: this.clock.now(),
      expiresInMinutes: 30,
    });

    await this.tokens.save(token);

    await this.notifier.send(
      user.email,
      token.value,
    );
  }
}
```

Prisma와 Resend는 바깥쪽 어댑터에서 인터페이스를 구현한다.

```ts
class PrismaPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async save(
    token: PasswordResetToken,
  ): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId: token.userId,
        token: token.value,
        expiresAt: token.expiresAt,
      },
    });
  }
}
```

핵심 서비스는 어떤 ORM과 메일 SDK가 사용되는지 알지 못한다.

## 모든 라이브러리를 감싸야 하는 것은 아니다

다음과 같은 래퍼는 대개 가치가 없다.

```ts
interface ArrayLengthCalculator {
  calculate<T>(items: T[]): number;
}

class DefaultArrayLengthCalculator
  implements ArrayLengthCalculator
{
  calculate<T>(items: T[]): number {
    return items.length;
  }
}
```

DIP를 지키기 위해 언어의 기본 기능이나 안정적인 순수 라이브러리까지 모두 인터페이스로 감싸면 간접 계층만 늘어난다.

추상화할 가치가 큰 대상은 일반적으로 다음과 같다.

- 데이터베이스
    
- 외부 HTTP API
    
- 메시지 브로커
    
- 파일 저장소
    
- 메일·문자 발송
    
- 결제 시스템
    
- 현재 시간
    
- 난수 및 UUID
    
- 운영체제나 실행 환경
    
- 교체 가능성이 높은 외부 SDK
    
- 도메인에서 특별한 의미를 가지는 기술 기능
    

다음 대상은 별도 추상화의 가치가 낮을 수 있다.

- 배열 연산
    
- 문자열 조작
    
- 단순한 수학 함수
    
- 충분히 안정적인 순수 유틸리티
    
- 애플리케이션 전반에서 직접 사용해도 의미가 명확한 표준 API
    

판단 기준은 “구체 클래스인가”가 아니다.

> **이 의존성이 핵심 정책을 기술 세부 사항에 결합시키는가?**

---

# SOLID를 기계적으로 적용할 때 발생하는 문제

## 클래스마다 인터페이스를 하나씩 만드는 경우

좋지 않은 예:

```ts
interface IUserService {
  createUser(
    input: CreateUserInput,
  ): Promise<User>;
}

class UserService implements IUserService {
  async createUser(
    input: CreateUserInput,
  ): Promise<User> {
    // ...
  }
}
```

구현체가 하나뿐이고, 소비자 관점의 계약도 아니며, 교체하거나 테스트 대역으로 사용할 필요도 없다면 인터페이스는 별다른 가치를 주지 않는다.

단순히 클래스 앞에 `I`를 붙인 인터페이스를 만드는 것은 DIP가 아니다.

인터페이스는 구현자를 위해 만드는 것이 아니라 **소비자가 필요로 하는 계약을 표현하기 위해 만든다.**

## 한 줄마다 메서드를 분리하는 경우

좋지 않은 예:

```ts
async createOrder(input: CreateOrderInput) {
  const product = await this.findProduct(
    input.productId,
  );

  const order = this.makeOrder(
    product,
    input.quantity,
  );

  await this.persistOrder(order);

  await this.publishOrderCreated(order);

  return this.returnOrder(order);
}
```

각 메서드가 이름 이상의 의미를 추가하지 않고, 한 번만 사용되며, 흐름을 이해하려면 계속 다른 위치로 이동해야 한다면 분리가 가독성을 떨어뜨린다.

다음처럼 유스케이스 흐름을 한곳에 두는 편이 더 명확할 수 있다.

```ts
async createOrder(
  input: CreateOrderInput,
): Promise<Order> {
  const product =
    await this.productRepository.findById(
      input.productId,
    );

  if (!product) {
    throw new ProductNotFoundError(
      input.productId,
    );
  }

  const order = Order.create({
    product,
    quantity: input.quantity,
  });

  await this.orderRepository.save(order);
  await this.eventPublisher.publish(
    OrderCreated.from(order),
  );

  return order;
}
```

함수 추출은 코드 줄 수를 줄이기 위한 것이 아니다.

다음 중 하나를 달성할 때 가치가 있다.

- 의미 있는 개념에 이름을 붙인다.
    
- 복잡한 세부 구현을 숨긴다.
    
- 독립적인 정책을 분리한다.
    
- 여러 곳에서 동일한 규칙을 재사용한다.
    
- 추상화 수준이 다른 코드를 분리한다.
    

## 패턴을 적용하기 위해 구조를 복잡하게 만드는 경우

하나의 구현밖에 없는데 다음을 모두 만들 수 있다.

```text
OrderService
OrderServiceImpl
OrderServiceFactory
OrderServiceProvider
AbstractOrderService
DefaultOrderServiceFactory
OrderServiceStrategy
OrderServiceRegistry
```

이 구조는 미래 확장을 지원할 수 있지만 현재 요구사항을 이해하기 어렵게 만든다.

디자인 패턴은 문제를 해결하기 위한 이름 있는 해법이지, 코드 품질을 증명하는 장식이 아니다.

> **현재 존재하는 변화와 결합 문제를 해결할 때만 패턴을 도입한다.**

---

# 클린 코드의 실용적인 원칙

## 1. 이름은 코드의 역할이 아니라 도메인의 의미를 표현한다

좋지 않은 예:

```ts
function process(
  data: Data,
  flag: boolean,
): Result {
  // ...
}
```

`process`, `data`, `flag`, `result`만으로는 이 코드가 무엇을 의미하는지 알 수 없다.

더 나은 예:

```ts
function calculateRefundAmount(
  order: Order,
  includeShippingFee: boolean,
): Money {
  // ...
}
```

더 나아가 불리언 인수를 제거할 수도 있다.

```ts
type RefundShippingFeePolicy =
  | 'INCLUDE'
  | 'EXCLUDE';

function calculateRefundAmount(
  order: Order,
  shippingFeePolicy:
    RefundShippingFeePolicy,
): Money {
  // ...
}
```

호출부도 의도가 드러난다.

```ts
calculateRefundAmount(
  order,
  'INCLUDE',
);
```

좋은 이름은 주석 없이도 다음을 전달해야 한다.

- 무엇을 다루는가
    
- 어떤 결과를 만드는가
    
- 어떤 조건이나 정책이 적용되는가
    
- 단위가 무엇인가
    
- 실패 가능성이 있는가
    

## 구현 방식이 드러나는 이름

좋지 않은 예:

```ts
const userArray = await getUserList();
const userMap = convertUserArrayToMap(userArray);
```

자료구조가 핵심 의미가 아니라면 도메인 의미를 우선한다.

```ts
const activeUsers =
  await findActiveUsers();

const usersById =
  indexUsersById(activeUsers);
```

`getData`, `handleItem`, `manageState`, `processResponse`처럼 의미 범위가 지나치게 넓은 이름은 코드가 책임을 제대로 드러내지 못하고 있다는 신호다.

---

## 2. 함수는 짧아야 하는 것이 아니라 한 수준의 이야기를 해야 한다

함수는 무조건 5줄 이하이거나 10줄 이하일 필요가 없다.

중요한 것은 함수 안에서 서로 다른 추상화 수준이 뒤섞이지 않는 것이다.

좋지 않은 예:

```ts
async function registerUser(
  input: RegisterUserInput,
) {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      input.email,
    )
  ) {
    throw new Error('Invalid email');
  }

  const hash = await argon2.hash(
    input.password,
    {
      memoryCost: 65536,
      timeCost: 3,
    },
  );

  const result = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: hash,
    },
  });

  await fetch(
    'https://email-api.example.com/send',
    {
      method: 'POST',
      body: JSON.stringify({
        to: result.email,
        template: 'welcome-v2',
      }),
    },
  );

  return {
    id: result.id,
    email: result.email,
  };
}
```

사용자 등록 정책, 암호화 세부 설정, ORM 쿼리, HTTP 요청 형식이 한 함수에 섞여 있다.

더 나은 예:

```ts
async function registerUser(
  input: RegisterUserInput,
): Promise<RegisteredUser> {
  const email = Email.create(input.email);

  const existingUser =
    await userRepository.findByEmail(email);

  if (existingUser) {
    throw new EmailAlreadyRegisteredError(
      email,
    );
  }

  const password =
    await passwordHasher.hash(input.password);

  const user = User.register({
    email,
    password,
  });

  await userRepository.save(user);
  await welcomeNotifier.send(user);

  return RegisteredUser.from(user);
}
```

이 함수는 사용자 등록이라는 유스케이스 흐름을 한 수준에서 읽을 수 있다.

세부적인 이메일 형식, 해시 설정, ORM 구조, 외부 HTTP 요청은 각각의 경계 뒤에 숨겨져 있다.

---

## 3. 조회하는 함수는 몰래 상태를 변경하지 않는다

좋지 않은 예:

```ts
async function getUser(
  id: string,
): Promise<User> {
  const user = await repository.findById(id);

  if (!user) {
    throw new UserNotFoundError(id);
  }

  user.lastViewedAt = new Date();
  await repository.save(user);

  await analytics.track('USER_VIEWED', {
    userId: user.id,
  });

  return user;
}
```

이름은 사용자를 조회한다고 말하지만 실제로는 다음 부수 효과가 있다.

- 조회 시간 변경
    
- 데이터베이스 저장
    
- 분석 이벤트 발송
    

호출자는 단순 조회라고 생각하고 반복 호출하거나 트랜잭션 밖에서 사용할 수 있다.

더 나은 예:

```ts
async function findUser(
  id: string,
): Promise<User> {
  const user = await repository.findById(id);

  if (!user) {
    throw new UserNotFoundError(id);
  }

  return user;
}
```

상태 변경이 실제 요구사항이라면 이름에서 드러낸다.

```ts
async function viewUserProfile(
  id: string,
): Promise<User> {
  const user = await findUser(id);

  user.recordProfileView(clock.now());

  await repository.save(user);
  await analytics.trackProfileView(user.id);

  return user;
}
```

함수 이름과 실제 부수 효과가 일치해야 한다.

---

## 4. 도메인 규칙은 호출자의 기억에 맡기지 않는다

좋지 않은 예:

```ts
order.status = 'SHIPPING';
order.trackingNumber = trackingNumber;
order.shippedAt = new Date();

await orderRepository.save(order);
```

모든 호출자가 다음 규칙을 기억해야 한다.

- 결제가 완료된 주문만 배송할 수 있다.
    
- 운송장 번호가 필요하다.
    
- 배송 시작 시간을 기록해야 한다.
    
- 이미 취소된 주문은 배송할 수 없다.
    

한 곳에서 규칙을 빠뜨리면 유효하지 않은 주문 상태가 만들어진다.

더 나은 예:

```ts
class Order {
  startShipping(
    trackingNumber: TrackingNumber,
    shippedAt: Date,
  ): void {
    if (this.status !== 'PAID') {
      throw new OrderCannotBeShippedError(
        this.id,
        this.status,
      );
    }

    this.status = 'SHIPPING';
    this.trackingNumber = trackingNumber;
    this.shippedAt = shippedAt;
  }
}
```

호출부:

```ts
order.startShipping(
  TrackingNumber.create(input.trackingNumber),
  clock.now(),
);

await orderRepository.save(order);
```

객체가 자신의 유효한 상태를 스스로 지키게 하면 잘못된 상태를 만들기 어려워진다.

이를 위해 모든 데이터를 클래스에 넣을 필요는 없다. 중요한 것은 **여러 필드가 함께 만족해야 하는 불변 조건을 한곳에서 보호하는 것**이다.

---

## 5. 불리언과 원시값만으로 의미를 전달하지 않는다

좋지 않은 예:

```ts
createUser(
  email,
  true,
  false,
  30,
);
```

호출부만 봐서는 `true`, `false`, `30`의 의미를 알 수 없다.

더 나은 예:

```ts
createUser({
  email,
  isEmailVerified: true,
  marketingAgreed: false,
  trialDays: 30,
});
```

서로 다른 의미를 가진 문자열과 숫자가 자주 섞인다면 값 객체나 구분된 타입을 검토할 수 있다.

좋지 않은 예:

```ts
function transfer(
  from: string,
  to: string,
  amount: number,
) {
  // ...
}
```

더 나은 예:

```ts
function transfer(
  sourceAccountId: AccountId,
  destinationAccountId: AccountId,
  amount: Money,
) {
  // ...
}
```

다만 모든 문자열을 클래스로 감싸는 것은 과도할 수 있다.

값 객체는 다음과 같은 경우 특히 유용하다.

- 생성 시 검증이 필요하다.
    
- 단위가 중요하다.
    
- 서로 바뀌면 위험한 값이다.
    
- 해당 값과 관련된 연산이 반복된다.
    
- 유효성 규칙이 여러 위치에 흩어져 있다.
    

---

## 6. 오류는 실패 이유를 구체적으로 전달한다

좋지 않은 예:

```ts
throw new Error('Invalid request');
```

호출자는 어떤 입력이 왜 잘못됐는지 구분하기 어렵다.

더 나은 예:

```ts
throw new InvalidOrderQuantityError({
  quantity: input.quantity,
  minimum: 1,
});
```

또는 안정적인 오류 코드를 제공한다.

```ts
class InvalidOrderQuantityError
  extends DomainError
{
  readonly code =
    'INVALID_ORDER_QUANTITY';

  constructor(
    readonly quantity: number,
  ) {
    super(
      `Order quantity must be greater than zero: ${quantity}`,
    );
  }
}
```

오류 메시지 문구 자체보다 다음이 중요하다.

- 오류 종류
    
- 안정적인 코드
    
- 문제를 일으킨 입력
    
- 복구 가능 여부
    
- 사용자 오류인지 시스템 오류인지
    

모든 예외를 하나의 `BadRequestException`으로 즉시 바꾸면 내부 실패 원인을 잃을 수 있다. 도메인 오류를 경계 계층에서 HTTP 상태로 변환하는 편이 보통 더 명확하다.

---

## 7. 코드의 지역성을 과도한 분리보다 우선한다

함수를 잘게 분리하면 각 함수는 짧아지지만 전체 흐름을 이해하기 위해 여러 파일과 메서드를 이동해야 할 수 있다.

좋지 않은 예:

```ts
function calculateOrderTotal(
  order: Order,
): number {
  const subtotal = getSubtotal(order);
  const discount = getDiscount(
    order,
    subtotal,
  );
  const shippingFee = getShippingFee(
    order,
    subtotal,
  );
  return getFinalTotal(
    subtotal,
    discount,
    shippingFee,
  );
}
```

각 함수가 단순한 산술 한 줄이고 다른 곳에서 사용되지 않는다면 분리가 오히려 흐름을 숨긴다.

다음처럼 한곳에서 읽히는 편이 더 명확할 수 있다.

```ts
function calculateOrderTotal(
  order: Order,
): number {
  const subtotal = order.items.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0,
  );

  const discount =
    discountPolicy.calculate(order, subtotal);

  const shippingFee =
    shippingPolicy.calculate(order, subtotal);

  return subtotal - discount + shippingFee;
}
```

반대로 할인 정책과 배송비 정책이 독립적으로 복잡하거나 변경된다면 분리하는 것이 적절하다.

함수 추출 여부는 줄 수보다 다음을 기준으로 판단한다.

> 이 코드 조각이 독립적인 이름, 규칙, 변경 이유를 가지는가?

---

# DRY를 기계적으로 적용하지 않는다

DRY는 흔히 다음처럼 오해된다.

> 같은 코드가 두 번 나오면 반드시 공통 함수로 만들어야 한다.

DRY의 원래 목적은 코드 모양의 중복보다 **동일한 지식과 규칙이 여러 곳에 흩어지는 것을 막는 것**에 가깝다.

## 모양만 비슷한 코드를 억지로 합치는 경우

좋지 않은 예:

```ts
function calculateDiscount(
  type: 'COUPON' | 'EMPLOYEE',
  amount: number,
  options: {
    rate?: number;
    maximum?: number;
    minimumPurchase?: number;
    includeShipping?: boolean;
  },
): number {
  if (type === 'COUPON') {
    // 쿠폰 할인 규칙
  }

  if (type === 'EMPLOYEE') {
    // 임직원 할인 규칙
  }

  return 0;
}
```

처음에는 두 할인 계산이 비슷해 보였지만 요구사항이 달라지면서 옵션과 분기가 늘어난다.

- 쿠폰은 최대 할인 금액이 있다.
    
- 임직원 할인은 특정 브랜드를 제외한다.
    
- 쿠폰은 배송비에 적용되지 않는다.
    
- 임직원 할인은 다른 프로모션과 중복되지 않는다.
    

공통화를 유지하기 위해 불리언과 선택적 옵션이 계속 추가된다.

더 나은 예:

```ts
function calculateCouponDiscount(
  order: Order,
  coupon: Coupon,
): Money {
  // 쿠폰 정책
}

function calculateEmployeeDiscount(
  order: Order,
  employee: Employee,
): Money {
  // 임직원 정책
}
```

코드 일부가 비슷해도 서로 다른 비즈니스 규칙이라면 분리해 두는 편이 안전하다.

## 진짜 중복

다음처럼 동일한 규칙이 여러 위치에 복사돼 있다면 DRY 대상이다.

```ts
// 주문 화면
const canCancel =
  order.status === 'PAID' &&
  !order.shippingStarted;

// 관리자 화면
const cancellable =
  order.status === 'PAID' &&
  !order.shippingStarted;

// 배치 작업
if (
  order.status === 'PAID' &&
  !order.shippingStarted
) {
  // 자동 취소
}
```

주문 취소 가능 조건이라는 동일한 도메인 지식이 세 곳에 흩어졌다.

더 나은 예:

```ts
class Order {
  canCancel(): boolean {
    return (
      this.status === 'PAID' &&
      !this.shippingStarted
    );
  }
}
```

또는 정책 함수로 분리한다.

```ts
function canCancelOrder(
  order: Order,
): boolean {
  return (
    order.status === 'PAID' &&
    !order.shippingStarted
  );
}
```

DRY 적용 전에 다음을 구분해야 한다.

> 코드가 우연히 비슷한가, 같은 규칙을 표현하고 있는가?

---

# Rule of Three — 세 번째 반복에서 추상화를 검토한다

중복을 발견했다고 즉시 공통화하지 않는다.

두 코드가 현재는 같아 보여도 이후 서로 다른 방향으로 변경될 수 있다.

실용적인 기본값은 다음과 같다.

- 첫 번째 구현에서는 요구사항을 명확하게 해결한다.
    
- 두 번째 반복에서는 중복을 인지하되 성급하게 추상화하지 않는다.
    
- 세 번째 반복에서 공통점과 차이점이 충분히 드러났는지 검토한다.
    

이는 반드시 세 번까지 복사하라는 절대 규칙이 아니다.

동일한 보안 규칙, 금액 계산, 권한 판단처럼 복사되는 순간 위험한 규칙은 두 번째에도 즉시 추상화할 수 있다.

반대로 화면의 우연히 비슷한 두 컴포넌트는 세 번 이상 반복돼도 서로 독립적으로 유지하는 편이 나을 수 있다.

## 성급한 공통화

좋지 않은 예:

```ts
function createEntity<T>(
  type: 'USER' | 'ORDER',
  input: unknown,
): T {
  if (type === 'USER') {
    // ...
  }

  if (type === 'ORDER') {
    // ...
  }

  throw new Error('Unsupported type');
}
```

사용자 생성과 주문 생성에 모두 “생성”이라는 이름이 들어간다는 이유로 하나의 추상화에 넣었다.

하지만 두 기능은 입력, 검증, 저장, 실패 조건, 부수 효과가 전혀 다르다.

추상화는 코드의 동사를 맞추는 작업이 아니다.

> **같은 정책이 같은 이유로 반복될 때 도입한다.**

---

# YAGNI — 아직 필요하지 않은 기능은 만들지 않는다

YAGNI는 다음 의미다.

> **현재 요구사항에 없는 확장성과 기능을 예상만으로 구현하지 않는다.**

좋지 않은 예:

```ts
interface DiscountPlugin {
  name: string;
  priority: number;

  supports(
    context: DiscountContext,
  ): boolean;

  execute(
    context: DiscountContext,
  ): Promise<DiscountResult>;
}

class DiscountPluginRegistry {
  private readonly plugins =
    new Map<string, DiscountPlugin>();

  register(plugin: DiscountPlugin) {
    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string) {
    this.plugins.delete(name);
  }

  findApplicablePlugins(
    context: DiscountContext,
  ) {
    // ...
  }
}
```

현재 요구사항이 VIP 회원에게 10% 할인하는 것뿐인데 향후 다양한 할인 플러그인이 생길 가능성을 상상해 전체 플러그인 시스템을 만들었다.

현재 요구사항만 구현한다면 다음으로 충분할 수 있다.

```ts
function calculateVipDiscount(
  customer: Customer,
  orderAmount: Money,
): Money {
  if (customer.grade !== 'VIP') {
    return Money.zero();
  }

  return orderAmount.multiply(0.1);
}
```

나중에 할인 유형이 실제로 추가되고 변경 패턴이 확인되면 그때 전략이나 정책 객체로 분리한다.

## YAGNI가 의미하지 않는 것

YAGNI는 품질을 생략하라는 원칙이 아니다.

다음은 미래를 위한 과설계가 아니라 현재 시스템의 기본 요구사항일 수 있다.

- 입력 검증
    
- 오류 처리
    
- 로그와 관측 가능성
    
- 보안
    
- 데이터 정합성
    
- 마이그레이션과 롤백 전략
    
- 핵심 기능 테스트
    
- 외부 호출의 타임아웃
    
- 중복 요청 방지
    
- 개인정보 보호
    

“아직 장애가 나지 않았다”는 이유로 타임아웃이나 오류 처리를 생략하는 것은 YAGNI가 아니다.

YAGNI가 막고자 하는 것은 **근거 없는 미래 시나리오를 위한 구조적 복잡성**이다.

---

# KISS — 가장 단순한 해결책을 선택한다

KISS는 가장 짧은 코드를 작성하라는 의미가 아니다.

> **요구사항을 정확하게 만족하는 선택지 중 이해와 변경이 가장 쉬운 것을 선택한다.**

짧지만 읽기 어려운 코드:

```ts
const result = users
  .filter(u => u.a && !u.d)
  .reduce(
    (m, u) => (
      m.set(
        u.g,
        (m.get(u.g) ?? 0) + u.p,
      ),
      m
    ),
    new Map<string, number>(),
  );
```

더 길지만 의미가 명확한 코드:

```ts
const activeUsers =
  users.filter(user => {
    return (
      user.isActive &&
      !user.isDeleted
    );
  });

const totalPointsByGroup =
  new Map<string, number>();

for (const user of activeUsers) {
  const currentPoints =
    totalPointsByGroup.get(user.groupId) ?? 0;

  totalPointsByGroup.set(
    user.groupId,
    currentPoints + user.points,
  );
}
```

단순함은 문자 수가 아니라 **머릿속에서 동시에 추적해야 하는 개념의 수**로 판단해야 한다.

KISS를 적용할 때는 다음 순서를 고려한다.

1. 현재 요구사항을 직접 해결한다.
    
2. 이름과 흐름이 명확한지 확인한다.
    
3. 실제 중복과 변경 패턴을 관찰한다.
    
4. 필요할 때만 추상화한다.
    
5. 추상화가 호출부를 더 어렵게 만들면 다시 단순화한다.
    

---

# 미래 변경을 예측하지 말고 변경 가능성을 격리한다

YAGNI 때문에 아무런 경계도 만들지 않거나, OCP 때문에 모든 가능성을 미리 구현할 필요는 없다.

실용적인 중간 지점은 다음과 같다.

> **미래 기능은 만들지 않되, 변경 가능성이 높은 외부 경계가 핵심 정책에 직접 침투하지 않도록 한다.**

예를 들어 현재 결제사가 하나뿐이라도 결제 SDK를 도메인 로직 전체에 직접 사용하지 않는 것이 좋다.

과도한 설계:

```ts
PaymentPluginRegistry
PaymentPluginLoader
PaymentPluginFactory
PaymentPluginMetadata
PaymentPluginLifecycleManager
```

지나치게 결합된 설계:

```ts
class OrderService {
  async completeOrder(order: Order) {
    await stripe.paymentIntents.create({
      amount: order.totalPrice,
    });
  }
}
```

실용적인 설계:

```ts
interface PaymentGateway {
  approve(
    request: PaymentRequest,
  ): Promise<PaymentApproval>;
}

class OrderPaymentService {
  constructor(
    private readonly paymentGateway:
      PaymentGateway,
  ) {}
}
```

결제 플러그인 시스템은 만들지 않았지만 외부 결제사와 핵심 유스케이스 사이의 경계는 분리했다.

---

# 추상화가 필요한 신호

다음 현상이 실제로 나타난다면 추상화를 검토할 가치가 있다.

## 같은 변경이 여러 곳에서 반복된다

할인율 변경 하나 때문에 여러 서비스와 화면을 함께 수정해야 한다면 동일한 정책이 흩어져 있을 가능성이 크다.

## 조건문에 새로운 유형이 계속 추가된다

결제 수단, 파일 형식, 알림 채널처럼 새로운 종류가 반복적으로 추가된다면 전략 또는 구현체 분리를 검토할 수 있다.

## 선택적 인수와 불리언이 계속 늘어난다

```ts
process(data, {
  legacy: true,
  skipValidation: false,
  useCache: true,
  asyncMode: false,
});
```

이 구조는 서로 다른 책임이나 동작 유형을 억지로 하나에 담고 있다는 신호일 수 있다.

## 동일한 버그가 여러 위치에서 반복된다

같은 권한 검사나 금액 계산 오류가 여러 곳에서 발생한다면 규칙이 한곳에서 관리되지 않고 있을 가능성이 높다.

## 외부 기술 세부 사항이 핵심 로직에 퍼져 있다

ORM 쿼리, HTTP 요청, 메시지 브로커 형식이 여러 유스케이스에 직접 노출돼 있다면 경계를 분리할 가치가 있다.

## 이름을 붙이기 어렵다

공통 함수에 적절한 이름을 붙이기 어렵고 `handle`, `process`, `common`, `util` 같은 단어밖에 떠오르지 않는다면 추상화의 범위가 잘못됐을 가능성이 있다.

---

# 추상화를 미뤄야 하는 신호

다음 상황에서는 중복이나 직접 구현을 잠시 허용하는 편이 나을 수 있다.

- 구현체가 하나뿐이다.
    
- 변화 방향을 아직 알 수 없다.
    
- 두 코드가 겉으로만 비슷하고 비즈니스 의미는 다르다.
    
- 공통화를 위해 선택적 옵션과 타입 분기가 많이 필요하다.
    
- 추상화 이름이 실제 도메인 개념을 표현하지 못한다.
    
- 호출부가 기존 코드보다 복잡해진다.
    
- 인터페이스가 실제 소비자의 계약이 아니라 구현체 복사본이다.
    
- 미래 요구사항이 구체적인 일정이나 근거 없이 “언젠가” 수준이다.
    

좋은 추상화는 코드를 숨기기만 하지 않는다.

> **중요한 개념을 드러내고, 변경이 퍼지는 범위를 줄여야 한다.**

---

# 상속보다 조합을 우선한다

상속은 강한 결합을 만든다. 하위 클래스는 상위 클래스의 내부 동작과 변경에 영향을 받는다.

좋지 않은 예:

```ts
class BaseNotificationService {
  async send(
    recipient: string,
    message: string,
  ) {
    const formatted =
      this.formatMessage(message);

    await this.deliver(
      recipient,
      formatted,
    );
  }

  protected formatMessage(
    message: string,
  ): string {
    return `[NOTICE] ${message}`;
  }

  protected async deliver(
    recipient: string,
    message: string,
  ): Promise<void> {
    throw new Error('Not implemented');
  }
}

class SmsNotificationService
  extends BaseNotificationService
{
  protected async deliver(
    recipient: string,
    message: string,
  ) {
    // SMS 전송
  }
}
```

하위 클래스는 상위 클래스가 정한 처리 순서와 포맷 정책을 따라야 한다.

이메일과 SMS의 요구사항이 달라질수록 `protected` 메서드와 오버라이드가 늘어난다.

조합을 사용한 예:

```ts
interface MessageFormatter {
  format(message: string): string;
}

interface MessageSender {
  send(
    recipient: string,
    message: string,
  ): Promise<void>;
}

class NotificationService {
  constructor(
    private readonly formatter:
      MessageFormatter,
    private readonly sender: MessageSender,
  ) {}

  async send(
    recipient: string,
    message: string,
  ): Promise<void> {
    const formatted =
      this.formatter.format(message);

    await this.sender.send(
      recipient,
      formatted,
    );
  }
}
```

포맷 정책과 발송 방식은 독립적으로 조합할 수 있다.

다만 상속 자체가 나쁜 것은 아니다. 다음 조건을 만족한다면 적절할 수 있다.

- 실제로 명확한 `is-a` 관계다.
    
- 상위 타입의 행동 계약을 모든 하위 타입이 지킨다.
    
- 공통 동작이 안정적이다.
    
- 하위 타입이 상위 타입의 내부 구현을 과도하게 알 필요가 없다.
    
- 상속 깊이가 얕다.
    

코드 재사용만을 목적으로 상속을 선택하는 것은 피하는 편이 좋다.

---

# 일관성은 개인적인 우아함보다 중요하다

코드베이스에 이미 명확한 패턴이 있다면 개인적으로 더 세련돼 보이는 구조보다 기존 패턴을 따르는 편이 유지보수에 유리할 수 있다.

예를 들어 프로젝트 전체가 다음 패턴을 사용한다고 가정한다.

```ts
class CreateOrderUseCase {
  async execute(
    command: CreateOrderCommand,
  ): Promise<CreateOrderResult> {
    // ...
  }
}
```

한 기능만 다음처럼 전혀 다른 구조로 작성하면 국소적으로는 좋더라도 전체 코드베이스의 탐색 비용을 높일 수 있다.

```ts
const createOrder =
  ReaderTaskEither<
    Dependencies,
    DomainError,
    Order
  >(...)
```

새로운 패턴이 실제 문제를 해결한다면 팀 차원에서 도입할 수 있다. 그러나 한 파일에서만 개인적인 선호를 적용하면 일관성이 깨진다.

> **지역적인 최적화보다 코드베이스 전체의 예측 가능성을 우선한다.**

---

# 성능과 클린 코드가 충돌하는 경우

측정된 성능 문제를 해결하기 위해 더 복잡한 구현이 필요할 수 있다.

직관적인 구현:

```ts
const result = orders.map(order => {
  const user = users.find(
    user => user.id === order.userId,
  );

  return {
    order,
    user,
  };
});
```

대량 데이터에서 `find`가 반복되면 시간 복잡도가 커질 수 있다.

성능을 고려한 구현:

```ts
const usersById = new Map(
  users.map(user => [user.id, user]),
);

const result = orders.map(order => {
  return {
    order,
    user: usersById.get(order.userId),
  };
});
```

이 경우에는 더 나은 알고리즘이 가독성도 해치지 않는다.

더 복잡한 최적화가 필요하다면 다음을 남기는 것이 좋다.

- 어떤 병목을 해결하는가
    
- 데이터 규모가 어느 정도인가
    
- 측정 결과가 무엇인가
    
- 직관적인 구현을 사용하지 않은 이유가 무엇인가
    
- 변경 시 지켜야 할 성능 조건이 무엇인가
    

측정되지 않은 성능을 이유로 복잡한 구조를 미리 만드는 것은 피해야 한다.

---

# 클린 코드의 우선순위

실무에서는 다음 순서로 판단하는 것이 유용하다.

1. 정확성
    
2. 데이터 정합성과 보안
    
3. 변경 안전성
    
4. 도메인 규칙의 명확성
    
5. 가독성과 예측 가능성
    
6. 테스트 가능성
    
7. 코드베이스의 일관성
    
8. 측정된 성능
    
9. 추상화의 우아함
    

상황에 따라 순서는 달라질 수 있다.

결제 처리에서는 정합성과 중복 방지가 최우선이고, 대량 데이터 처리에서는 성능의 우선순위가 올라갈 수 있다.

하지만 추상화의 아름다움이 정확성과 이해 가능성보다 먼저 와서는 안 된다.

---

# 코드 리뷰에서 확인할 질문

SOLID와 클린 코드를 리뷰할 때 원칙 이름을 직접 지적하기보다 변경과 책임을 기준으로 질문하는 편이 실용적이다.

## 책임과 변경 범위

- 이 코드는 어떤 이유로 변경될 수 있는가?
    
- 서로 다른 정책이 하나의 파일에 섞여 있지 않은가?
    
- 반대로 하나의 흐름을 지나치게 여러 계층으로 분산하지 않았는가?
    
- 이 변경 때문에 관계없는 기능까지 수정해야 하지는 않는가?
    

## 추상화

- 이 인터페이스는 실제 소비자의 계약인가, 구현체를 그대로 복사한 것인가?
    
- 현재 존재하는 변화 패턴을 해결하는가?
    
- 아직 존재하지 않는 미래 요구사항을 위해 만들어진 것은 아닌가?
    
- 공통화된 코드가 실제로 같은 비즈니스 규칙인가?
    
- 공통화를 위해 불리언과 선택적 옵션이 늘어나지는 않았는가?
    

## 의존성

- 핵심 정책이 ORM, SDK, 프레임워크에 직접 결합돼 있지 않은가?
    
- 테스트하기 어려운 외부 경계가 명시적으로 분리돼 있는가?
    
- 반대로 안정적인 기본 기능까지 불필요하게 래핑하지 않았는가?
    
- 구현체를 교체했을 때 기존 계약이 유지되는가?
    

## 가독성

- 이름만으로 도메인 의미를 이해할 수 있는가?
    
- 함수가 서로 다른 추상화 수준을 한꺼번에 다루지 않는가?
    
- 코드를 이해하기 위해 지나치게 많은 파일을 이동해야 하지 않는가?
    
- 중요한 비즈니스 규칙이 호출자의 기억에 의존하지 않는가?
    
- 함수 이름과 실제 부수 효과가 일치하는가?
    

## 실용성

- 이 복잡성이 현재 해결하려는 문제에 비례하는가?
    
- 더 직접적이고 단순한 구현으로도 요구사항을 만족할 수 있는가?
    
- 추상화를 제거했을 때 실제로 어떤 문제가 생기는가?
    
- 중복을 허용했을 때 생기는 위험이 공통화 비용보다 큰가?
    
- 6개월 뒤 변경할 사람이 현재 구조를 빠르게 이해할 수 있는가?
    

---

# 최종 원칙

SOLID와 클린 코드는 지켜야 할 형식이 아니라 판단을 돕는 기준이다.

좋은 코드는 반드시 클래스가 작거나, 인터페이스가 많거나, 디자인 패턴을 사용하지 않는다.

좋은 코드는 다음 특성을 가진다.

> **중요한 규칙이 명확하고, 변경이 필요한 위치를 찾기 쉬우며, 수정의 영향 범위를 예측할 수 있다.**

SRP는 모든 코드를 잘게 나누라는 원칙이 아니다. 서로 다른 이유로 변경되는 코드를 분리하는 원칙이다.

OCP는 모든 미래 확장을 미리 준비하라는 원칙이 아니다. 반복적으로 변화하는 지점을 안정적인 코드에서 격리하는 원칙이다.

LSP는 타입만 맞추라는 원칙이 아니다. 구현체가 동일한 행동 계약을 지키게 하는 원칙이다.

ISP는 인터페이스를 한 메서드씩 나누라는 원칙이 아니다. 소비자가 사용하지 않는 기능에 의존하지 않게 하는 원칙이다.

DIP는 모든 클래스 앞에 인터페이스를 만들라는 원칙이 아니다. 핵심 정책을 외부 기술의 구체적인 세부 사항으로부터 보호하는 원칙이다.

DRY는 비슷한 코드 모양을 모두 합치라는 원칙이 아니다. 동일한 지식과 규칙이 여러 곳에서 서로 다르게 변경되는 것을 막는 원칙이다.

Rule of Three는 무조건 세 번 복사하라는 원칙이 아니다. 변화의 패턴을 알기 전에 성급한 추상화를 만들지 않기 위한 안전장치다.

YAGNI는 품질을 포기하라는 원칙이 아니다. 근거 없는 미래 요구사항을 위해 현재의 복잡성을 높이지 말라는 원칙이다.

KISS는 가장 짧은 코드를 작성하라는 원칙이 아니다. 요구사항을 만족하는 선택지 중 이해하고 변경하기 가장 쉬운 구조를 선택하라는 원칙이다.

결국 가장 실용적인 기준은 다음과 같다.

> **현재 요구사항을 명확하게 해결하고, 실제로 예상 가능한 다음 변경을 막지 않으며, 아직 존재하지 않는 문제를 위해 구조를 복잡하게 만들지 않는다.**