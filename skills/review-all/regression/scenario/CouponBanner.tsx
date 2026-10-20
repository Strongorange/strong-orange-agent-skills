import { Button } from '@acme/ui';
import type { Coupon, User } from './types';

type CouponBannerProps = {
  user: User;
  coupon: Coupon;
  onApply: (couponId: string) => void;
};

export function CouponBanner({ user, coupon, onApply }: CouponBannerProps) {
  const isUsable = new Date(coupon.expiresAt).getTime() > Date.now() && user.grade !== 'basic' && coupon.minAmount <= 30000;

  return (
    <aside>
      <strong>{coupon.title}</strong>
      <span>{coupon.discountRate}% 할인</span>
      <Button disabled={!isUsable} onClick={() => onApply(coupon.id)}>
        쿠폰 적용
      </Button>
    </aside>
  );
}
