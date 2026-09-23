import { Order } from './order';
import { OrderRepository, FileStorage } from './ports';
import { InvalidCouponError } from './errors';

export function collectUsableCoupons(users: User[], now: Date): Coupon[] {
  const result: Coupon[] = [];

  if (users.length > 0) {
    for (const user of users) {
      if (user.isActive) {
        for (const coupon of user.coupons) {
          if (coupon.expiresAt > now && !coupon.usedAt) {
            result.push(coupon);
          }
        }
      }
    }
  }

  return result;
}

export function couponLabel(coupon: Coupon, now: Date): string {
  return coupon.usedAt
    ? '사용 완료'
    : coupon.expiresAt <= now
      ? '기간 만료'
      : coupon.discount >= 10000
        ? '고액 할인'
        : '사용 가능';
}

export function validateCoupon(
  coupon: Coupon,
  now: Date,
): { isValid: boolean; isExpired: boolean } {
  if (coupon.revokedAt) {
    return { isValid: false, isExpired: false };
  }
  if (coupon.expiresAt <= now) {
    return { isValid: false, isExpired: true };
  }
  return { isValid: true, isExpired: false };
}

export function applyCoupon(coupon: Coupon, amount: number, now: Date): number {
  const { isValid, isExpired } = validateCoupon(coupon, now);

  if (isValid && !isExpired) {
    return amount - coupon.discount;
  }
  if (!isValid && isExpired) {
    throw new InvalidCouponError(coupon.id, 'EXPIRED');
  }
  if (!isValid && !isExpired) {
    throw new InvalidCouponError(coupon.id, 'REVOKED');
  }

  return amount;
}

export class ReadOnlyArchiveStorage implements FileStorage {
  constructor(private client: ArchiveClient) {}

  read(path: string): Promise<Buffer> {
    return this.client.read(path);
  }

  write(): Promise<void> {
    throw new Error('not supported');
  }

  delete(): Promise<void> {
    throw new Error('not supported');
  }
}

export async function shipOrder(
  order: Order,
  trackingNumber: string,
  orders: OrderRepository,
): Promise<void> {
  order.status = 'SHIPPING';
  order.trackingNumber = trackingNumber;
  order.shippedAt = new Date();

  await orders.save(order);
}

export function shippingFeeFor(
  method: 'STANDARD' | 'EXPRESS',
  total: number,
): number {
  const base = method === 'EXPRESS' ? 5000 : 2500;

  if (total >= 50000) {
    if (method === 'STANDARD') {
      return 0;
    }
  }

  return base;
}

interface Coupon {
  id: string;
  discount: number;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}

interface User {
  isActive: boolean;
  coupons: Coupon[];
}

interface ArchiveClient {
  read(path: string): Promise<Buffer>;
}
