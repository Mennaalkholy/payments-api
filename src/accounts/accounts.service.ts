import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';
import { CreateAccountDto } from './dto';

export interface Balance {
  accountId: string;
  balance: number;
  currency: string;
}

@Injectable()
export class AccountsService {
  private readonly ttl = Number(process.env.BALANCE_CACHE_TTL ?? 30);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  static cacheKey(accountId: string): string {
    return `balance:${accountId}`;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: { owner: dto.owner, currency: dto.currency ?? 'USD' } });
  }

  /** Cache-aside read: Redis first, then Postgres, then populate cache with a TTL. */
  async getBalance(accountId: string): Promise<Balance & { cached: boolean }> {
    const hit = await this.redis.get(AccountsService.cacheKey(accountId));
    if (hit) return { ...(JSON.parse(hit) as Balance), cached: true };

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    const value: Balance = { accountId, balance: account.balance, currency: account.currency };
    await this.redis.set(AccountsService.cacheKey(accountId), JSON.stringify(value), 'EX', this.ttl);
    return { ...value, cached: false };
  }

  /** Called after every write that changes a balance. */
  async invalidateBalance(accountId: string): Promise<void> {
    await this.redis.del(AccountsService.cacheKey(accountId));
  }
}
