import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Locked = { id: string; balance: number };

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Debit an account atomically. The row is locked with SELECT ... FOR UPDATE inside
   * a DB transaction, so concurrent debits on the same account are serialised and
   * the balance check cannot race (no overdraw).
   */
  debit(accountId: string, amount: number, description?: string): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.lock(tx, accountId);
      if (account.balance < amount) {
        throw new UnprocessableEntityException('Insufficient funds');
      }
      await tx.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
      return tx.transaction.create({ data: { accountId, amount, type: 'DEBIT', description } });
    });
  }

  credit(accountId: string, amount: number, description?: string): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, accountId);
      await tx.account.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
      return tx.transaction.create({ data: { accountId, amount, type: 'CREDIT', description } });
    });
  }

  list(accountId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private async lock(tx: Prisma.TransactionClient, accountId: string): Promise<Locked> {
    const rows = await tx.$queryRaw<Locked[]>`
      SELECT id, balance FROM "Account" WHERE id = ${accountId} FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException(`Account ${accountId} not found`);
    return rows[0];
  }
}
