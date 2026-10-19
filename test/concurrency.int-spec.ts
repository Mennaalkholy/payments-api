import { UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { TransactionsService } from '../src/transactions/transactions.service';

/**
 * Requires a real PostgreSQL (DATABASE_URL) with migrations applied.
 * Two withdrawals of 80 race against a balance of 100: exactly one must win.
 */
describe('concurrent withdrawals (row-level locking)', () => {
  const prisma = new PrismaService();
  const transactions = new TransactionsService(prisma);

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  it('never overdraws when two debits run simultaneously', async () => {
    const account = await prisma.account.create({ data: { owner: 'race-test', balance: 100 } });

    const results = await Promise.allSettled([
      transactions.debit(account.id, 80, 'w1'),
      transactions.debit(account.id, 80, 'w2'),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(UnprocessableEntityException);

    const after = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(after.balance).toBe(20);
    expect(await prisma.transaction.count({ where: { accountId: account.id } })).toBe(1);
  });

  it('serialises many small concurrent debits correctly', async () => {
    const account = await prisma.account.create({ data: { owner: 'race-test-2', balance: 50 } });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => transactions.debit(account.id, 10, `w${i}`)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    const after = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(after.balance).toBe(0);
  });
});
