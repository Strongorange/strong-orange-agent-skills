import { describe, it, expect } from 'vitest';
import { Cart } from './cart';

describe('Cart', () => {
  // 장바구니를 만든다
  it('상품을 담으면 총액이 늘어난다', () => {
    const cart = new Cart();
    cart.add({ id: 'p1', price: 3000, qty: 2 });
    expect(cart.total()).toBe(6000);
  });

  it('빈 장바구니에서 결제해도 터지지 않는다', () => {
    const cart = new Cart();
    expect(() => cart.checkout()).not.toThrow();
  });
});
