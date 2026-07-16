import { describe, it, expect, vi } from 'vitest';
import { calculateCartTotal } from './cart-total';
import { cartService, discountService } from './cart-service';

describe('cart', () => {
  it('장바구니 총액을 계산한다', () => {
    const items = [
      { price: 10000, quantity: 2 },
      { price: 5000, quantity: 1 },
    ];
    const expected = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    expect(calculateCartTotal(items)).toBe(expected);
  });

  it('결제 시 할인이 적용된다', async () => {
    const spy = vi.spyOn(discountService, 'apply');

    await cartService.checkout({ items: [{ price: 10000, quantity: 1 }] });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
