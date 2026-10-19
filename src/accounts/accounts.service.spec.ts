import { NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';

describe('AccountsService balance cache', () => {
  const account = { id: 'a1', balance: 1000, currency: 'USD' };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let prisma: { account: { findUnique: jest.Mock } };
  let svc: AccountsService;

  beforeEach(() => {
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
    prisma = { account: { findUnique: jest.fn().mockResolvedValue(account) } };
    svc = new AccountsService(prisma as unknown as PrismaService, redis as unknown as Redis);
  });

  it('reads from Postgres on a miss and caches with a TTL', async () => {
    const result = await svc.getBalance('a1');
    expect(result).toEqual({ accountId: 'a1', balance: 1000, currency: 'USD', cached: false });
    expect(redis.set).toHaveBeenCalledWith('balance:a1', expect.any(String), 'EX', 30);
  });

  it('serves from Redis on a hit without touching Postgres', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ accountId: 'a1', balance: 5, currency: 'USD' }));
    const result = await svc.getBalance('a1');
    expect(result.cached).toBe(true);
    expect(prisma.account.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFound for unknown accounts', async () => {
    prisma.account.findUnique.mockResolvedValue(null);
    await expect(svc.getBalance('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('invalidates the cache key', async () => {
    await svc.invalidateBalance('a1');
    expect(redis.del).toHaveBeenCalledWith('balance:a1');
  });
});
