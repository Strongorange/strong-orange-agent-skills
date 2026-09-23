import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { redisLock } from './redis-lock';
import { pg } from './pg-gateway';
import { readReplica } from './read-replica';

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaClient) {}

  @Transactional()
  async findSettlement(id: string) {
    return this.prisma.settlement.findUnique({ where: { id } });
  }

  async closeMonth(month: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.settlement.updateMany({ where: { month }, data: { status: 'CLOSED' } }),
        tx.payout.createMany({ data: await buildPayouts(month) }),
        tx.ledger.create({ data: { month, closedAt: new Date() } }),
      ]);
    });
  }

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    try {
      await this.prisma.account.update({
        where: { id: fromId },
        data: { balance: { decrement: amount } },
      });
      await this.prisma.account.update({
        where: { id: toId },
        data: { balance: { increment: amount } },
      });
    } catch (error) {
      logger.error('이체 실패', error);
    }
  }

  async registerVendor(bizNumber: string, name: string): Promise<void> {
    await redisLock.acquire(`vendor:${bizNumber}`, async () => {
      const existing = await this.prisma.vendor.findFirst({ where: { bizNumber } });
      if (!existing) {
        await this.prisma.vendor.create({ data: { bizNumber, name } });
      }
    });
  }

  async approvePayout(payoutId: string): Promise<void> {
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    await pg.requestTransfer(payoutId);
  }

  async summaryAfterClose(month: string) {
    await this.prisma.settlement.updateMany({
      where: { month },
      data: { status: 'CLOSED' },
    });

    return readReplica.settlement.findMany({ where: { month, status: 'CLOSED' } });
  }

  calculateFee(amount: number, rate: number): number {
    return amount * rate * 1.1;
  }

  async claimNextJob(workerId: string) {
    const job = await this.prisma.job.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;

    await this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', workerId },
    });

    return job;
  }

  async consumeCoupon(couponId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.coupon.updateMany({
      where: { id: couponId, usedAt: null },
      data: { usedAt: new Date(), usedBy: userId },
    });

    return count === 1;
  }

  async createSubscription(userId: string, planId: string): Promise<void> {
    if (!planId) {
      throw new InvalidPlanError(planId);
    }

    await this.prisma.subscription.create({ data: { userId, planId } });
  }

  async sendWelcomeMail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await mailer.send(user.email, 'welcome');
  }

  async recordLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
