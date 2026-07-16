import { PrismaClient } from '@prisma/client';
import { Order } from './order';
import { UserNotFoundError } from './errors';

export class RefundCalculator {
  calculate(order: Order, includeShipping: boolean): number {
    let amount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (order.coupon) {
      amount -= order.coupon.discount;
    }
    if (includeShipping) {
      amount += order.shippingFee;
    }

    return amount;
  }
}

export async function getUserProfile(id: string, prisma: PrismaClient) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new UserNotFoundError(id);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
