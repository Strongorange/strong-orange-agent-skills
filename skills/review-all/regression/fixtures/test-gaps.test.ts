import { describe, it, expect, vi } from 'vitest';
import { OrderService } from './order-service';
import { InMemoryOrderRepository } from './in-memory-order-repository';
import { FixedClock } from './fixed-clock';
import { sleep } from './sleep';

describe('OrderService', () => {
  it('주문을 생성하면 결과가 저장된다', async () => {
    const repo = { save: vi.fn(), findById: vi.fn() };
    const validator = { assertQuantity: vi.fn() };
    const priceRule = { discountFor: vi.fn().mockReturnValue(0) };
    const service = new OrderService(repo, validator, priceRule);

    await service.create({ productId: 'p1', quantity: 2 });

    expect(repo.save).toHaveBeenCalled();
  });

  it('비동기 정산이 끝나면 잔액이 줄어든다', async () => {
    const service = new OrderService(new InMemoryOrderRepository());

    void service.settleAsync('order-1');
    await sleep(1000);

    expect(await service.balanceOf('user-1')).toBe(500);
  });

  it('생성된 주문의 스냅샷이 일치한다', async () => {
    const service = new OrderService(new InMemoryOrderRepository());

    const order = await service.create({ productId: 'p1', quantity: 1 });

    expect(order).toEqual({
      id: '6f1c9a2e-77d4-4b1a-9a0f-2d3e4f5a6b7c',
      productId: 'p1',
      quantity: 1,
      createdAt: new Date('2026-08-14T02:11:37.412Z'),
    });
  });

  it('목록 조회가 100ms 안에 끝난다', async () => {
    const service = new OrderService(new InMemoryOrderRepository());

    const started = Date.now();
    await service.listRecent('user-1');

    expect(Date.now() - started).toBeLessThan(100);
  });

  it('결제 승인 뒤에 저장한다 — 승인 실패 시 주문이 남으면 안 된다', async () => {
    const payment = { approve: vi.fn().mockResolvedValue({ id: 'pay-1' }) };
    const repo = new InMemoryOrderRepository();
    const saveSpy = vi.spyOn(repo, 'save');
    const service = new OrderService(repo, payment);

    await service.checkout({ userId: 'user-1', amount: 1000 });

    expect(payment.approve).toHaveBeenCalledBefore(saveSpy);
  });

  it('발행하는 정산 이벤트가 큐 계약을 지킨다', async () => {
    const bus = { publish: vi.fn() };
    const service = new OrderService(new InMemoryOrderRepository(), bus);

    await service.settle('order-1');

    expect(bus.publish).toHaveBeenCalledWith({
      version: 1,
      eventType: 'ORDER_SETTLED',
      orderId: 'order-1',
      settledAt: '2026-08-14T00:00:00.000Z',
    });
  });

  it('목록 조회가 N+1 쿼리를 내지 않는다', async () => {
    const repo = new InMemoryOrderRepository();
    const querySpy = vi.spyOn(repo, 'query');
    const service = new OrderService(repo);

    await service.listRecent('user-1');

    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('생성 시각은 주입한 시계를 따른다', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const service = new OrderService(new InMemoryOrderRepository(), clock);

    const order = await service.create({ productId: 'p1', quantity: 1 });

    expect(order.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });
});
