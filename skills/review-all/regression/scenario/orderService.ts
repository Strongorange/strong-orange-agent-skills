import { prisma } from './prisma';

interface OrderInput {
  userId: string;
  productId: string;
  quantity: number;
}

export async function createOrder(input: OrderInput) {
  const order = await prisma.order.create({
    data: { userId: input.userId, productId: input.productId, quantity: input.quantity },
  });

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new Error('product not found');

  await prisma.product.update({
    where: { id: input.productId },
    data: { stock: product.stock - input.quantity },
  });

  return order;
}
