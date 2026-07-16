import { describe, it, expect, vi } from 'vitest';
import { InMemoryOrderRepository } from './test-support/in-memory-order-repository';
import { OrderService } from './order-service';
import { PriceCalculator } from './price-calculator';
import { InvalidOrderQuantityError } from './errors';

function orderServiceWith(overrides: Partial<OrderServiceDeps>) {
  return new OrderService({
    repo: new InMemoryOrderRepository(),
    paymentGateway: { approve: vi.fn().mockResolvedValue({ ok: true }) },
    emailSender: { sendOrderCompleted: vi.fn() },
    priceCalculator: new PriceCalculator(),
    ...overrides,
  });
}

describe('OrderService', () => {
  it('상품 가격과 수량으로 주문 총액을 계산한다', async () => {
    const service = orderServiceWith({});

    const order = await service.createOrder({ productId: 'p1', unitPrice: 10000, quantity: 2 });

    expect(order.totalPrice).toBe(20000);
    expect(order.status).toBe('PENDING');
  });

  it('주문 완료 시 고객에게 완료 메일을 한 번 발송한다', async () => {
    const emailSender = { sendOrderCompleted: vi.fn() };
    const service = orderServiceWith({ emailSender });

    await service.completeOrder('order-1');

    expect(emailSender.sendOrderCompleted).toHaveBeenCalledOnce();
    expect(emailSender.sendOrderCompleted).toHaveBeenCalledWith({
      orderId: 'order-1',
      recipient: 'user@example.com',
    });
  });

  it('수량이 0이면 주문을 생성할 수 없다', async () => {
    const service = orderServiceWith({});

    await expect(
      service.createOrder({ productId: 'p1', unitPrice: 10000, quantity: 0 }),
    ).rejects.toBeInstanceOf(InvalidOrderQuantityError);
  });
});
