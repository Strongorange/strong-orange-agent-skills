import { PrismaClient } from '@prisma/client';
import { Mailer } from './mailer';

export class OrderService {
  constructor(
    private prisma: PrismaClient,
    private mailer: Mailer,
  ) {}

  async createOrder(input: CreateOrderInput) {
    if (input.quantity <= 0) throw new Error('Invalid quantity');

    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error('Product not found');

    let discount = 0;
    if (input.customerGrade === 'VIP') {
      discount = product.price * input.quantity * 0.1;
    }
    const totalPrice = product.price * input.quantity - discount;

    const order = await this.prisma.order.create({
      data: { productId: product.id, quantity: input.quantity, totalPrice, status: 'PENDING' },
    });

    await this.mailer.send({
      to: input.customerEmail,
      subject: '주문이 완료되었습니다',
      body: `주문번호: ${order.id}\n결제금액: ${order.totalPrice}`,
    });

    return order;
  }
}

export class PaymentService {
  constructor(private card: Gateway, private kakao: Gateway, private naver: Gateway) {}

  async pay(method: string, amount: number) {
    if (method === 'CARD') return this.card.approve(amount);
    if (method === 'KAKAO') return this.kakao.approve(amount);
    if (method === 'NAVER') return this.naver.approve(amount);
    throw new Error('unsupported payment method');
  }

  async cancel(method: string, paymentId: string) {
    if (method === 'CARD') return this.card.cancel(paymentId);
    if (method === 'KAKAO') return this.kakao.cancel(paymentId);
    if (method === 'NAVER') return this.naver.cancel(paymentId);
    throw new Error('unsupported payment method');
  }
}

export function createUser(
  email: string,
  verified: boolean,
  marketing: boolean,
  trialDays: number,
) {
  return userRepository.insert({ email, verified, marketing, trialDays });
}
