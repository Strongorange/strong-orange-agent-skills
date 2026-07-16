import { prisma } from './db';
import { paymentGateway } from './payment';
import { eventBus } from './events';
import { accountRepository } from './accounts';
import { logger } from './logger';

export async function createOrder(input: CreateOrderInput) {
  const order = await prisma.order.create({
    data: { productId: input.productId, quantity: input.quantity, status: 'PENDING' },
  });

  await prisma.product.update({
    where: { id: input.productId },
    data: { stock: { decrement: input.quantity } },
  });

  return order;
}

export async function transferMoney(sourceId: string, destId: string, amount: number) {
  try {
    await accountRepository.withdraw(sourceId, amount);
    await accountRepository.deposit(destId, amount);
  } catch (error) {
    logger.error(error);
  }
}

export async function pay(orderId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { id: orderId, amount, status: 'PENDING' } });

    const approval = await paymentGateway.approve({ orderId, amount });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paymentId: approval.id },
    });
    return order;
  });
}

export async function registerUser(email: string) {
  const user = await prisma.user.create({ data: { email } });

  await eventBus.publish({ type: 'USER_REGISTERED', userId: user.id });

  return user;
}
