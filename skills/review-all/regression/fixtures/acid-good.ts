import { prisma } from './db';
import { InsufficientStockError } from './errors';

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: { id: input.productId, stock: { gte: input.quantity } },
      data: { stock: { decrement: input.quantity } },
    });

    if (updated.count === 0) {
      throw new InsufficientStockError(input.productId);
    }

    return tx.order.create({
      data: { productId: input.productId, quantity: input.quantity, status: 'PENDING' },
    });
  });
}

export async function requestPayment(command: RequestPaymentCommand) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: command.orderId } });

    await tx.payment.create({
      data: {
        orderId: order.id,
        idempotencyKey: command.idempotencyKey,
        amount: order.totalPrice,
        status: 'PENDING',
      },
    });

    await tx.outboxMessage.create({
      data: {
        type: 'PAYMENT_APPROVAL_REQUESTED',
        aggregateId: order.id,
        payload: {
          orderId: order.id,
          amount: order.totalPrice,
          idempotencyKey: command.idempotencyKey,
        },
      },
    });
  });
}
