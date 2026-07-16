import { describe, it, expect, vi } from 'vitest';
import { OrderService } from './order-service';
import { productService } from './product-service';
import { calculateDiscount } from './discount';

describe('OrderService', () => {
  it('주문을 생성한다', async () => {
    const repo = { save: vi.fn(), findById: vi.fn() };
    const calc = { calculate: vi.fn().mockReturnValue(20000) };
    const mailer = { send: vi.fn() };
    const service = new OrderService(repo, calc, mailer);

    await service.createOrder({ productId: 'p1', quantity: 2 });

    expect(repo.save).toHaveBeenCalled();
  });

  it('없는 주문을 조회하면 에러가 난다', () => {
    const service = new OrderService(emptyRepo, calc, mailer);
    expect(service.findById('nope')).rejects.toThrow();
  });

  it('상품 상세를 반환한다', async () => {
    const result = await productService.getDetail('p1');
    expect(result).toMatchSnapshot();
  });

  it('할인 계산 분기를 실행한다', () => {
    expect(() => calculateDiscount({ grade: 'VIP', total: 100000 })).not.toThrow();
  });
});
