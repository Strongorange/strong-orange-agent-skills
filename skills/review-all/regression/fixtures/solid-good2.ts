import { Order } from './order';
import {
  CartRepository,
  InventoryChecker,
  PaymentGateway,
  OrderRepository,
  ReceiptSender,
} from './ports';

export function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

export function shippingFee(method: 'STANDARD' | 'EXPRESS'): number {
  return method === 'EXPRESS' ? 5000 : 2500;
}

export class CheckoutUseCase {
  constructor(
    private carts: CartRepository,
    private inventory: InventoryChecker,
    private payment: PaymentGateway,
    private orders: OrderRepository,
    private receipts: ReceiptSender,
  ) {}

  async execute(input: CheckoutInput): Promise<Order> {
    const cart = await this.carts.findById(input.cartId);
    await this.inventory.assertAvailable(cart);

    const approval = await this.payment.approve(cart.total);
    const order = Order.place(cart, approval);

    await this.orders.save(order);
    await this.receipts.send(order);

    return order;
  }
}

interface CheckoutInput {
  cartId: string;
}
