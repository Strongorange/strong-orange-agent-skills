import { prisma } from './db';
import { InsufficientStockError, EmailAlreadyRegisteredError } from './errors';

export async function decreaseStock(productId: string, quantity: number) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  if (product.stock < quantity) {
    throw new InsufficientStockError(productId);
  }

  await prisma.product.update({
    where: { id: productId },
    data: { stock: product.stock - quantity },
  });
}

export async function registerAccount(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new EmailAlreadyRegisteredError(email);
  }

  return prisma.user.create({ data: { email, name } });
}
