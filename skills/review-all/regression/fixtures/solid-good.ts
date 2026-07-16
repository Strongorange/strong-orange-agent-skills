import { Order } from './order';
import { ProductNotFoundError } from './errors';
import {
  ProductRepository,
  OrderRepository,
  DiscountPolicy,
  OrderConfirmationSender,
} from './ports';

export class CreateOrderUseCase {
  constructor(
    private products: ProductRepository,
    private orders: OrderRepository,
    private discountPolicy: DiscountPolicy,
    private confirmations: OrderConfirmationSender,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const discount = this.discountPolicy.calculate({
      product,
      quantity: input.quantity,
      grade: input.customerGrade,
    });

    const order = Order.create({ product, quantity: input.quantity, discount });

    await this.orders.save(order);
    await this.confirmations.send(order, input.customerEmail);

    return order;
  }
}

export function orderStatusLabel(status: OrderStatus): string {
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

export class SlackNotifier {
  constructor(private webhookUrl: string) {}

  async notify(text: string): Promise<void> {
    await fetch(this.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }
}

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
