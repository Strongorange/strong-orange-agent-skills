import { prisma } from './db';
import { metricsRepository } from './metrics';
import { clock } from './clock';
import { InsufficientPointsError } from './errors';

export async function getUser(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

export async function deductPoints(userId: string, points: number) {
  const updated = await prisma.user.updateMany({
    where: { id: userId, points: { gte: points } },
    data: { points: { decrement: points } },
  });

  if (updated.count === 0) {
    throw new InsufficientPointsError(userId);
  }
}

export async function recordLogin(userId: string) {
  await prisma.loginLog.create({ data: { userId, at: clock.now() } });

  await metricsRepository.increment('login_count');
}
