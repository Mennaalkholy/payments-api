import { ConflictException, Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

const IN_PROGRESS = '__in_progress__';

/**
 * Idempotency keys in Redis:
 *  - SET NX claims the key atomically, so only one request with a given key executes.
 *  - The final response is stored under the key and replayed for retries.
 *  - On failure the claim is released so the client can retry.
 */
@Injectable()
export class IdempotencyService {
  private readonly ttl = Number(process.env.IDEMPOTENCY_TTL ?? 86400);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async execute<T>(key: string, fn: () => Promise<T>): Promise<{ result: T; replayed: boolean }> {
    const redisKey = `idem:${key}`;
    const claimed = await this.redis.set(redisKey, IN_PROGRESS, 'EX', this.ttl, 'NX');
    if (!claimed) {
      const existing = await this.redis.get(redisKey);
      if (!existing || existing === IN_PROGRESS) {
        throw new ConflictException('A request with this Idempotency-Key is already in progress');
      }
      return { result: JSON.parse(existing) as T, replayed: true };
    }
    try {
      const result = await fn();
      await this.redis.set(redisKey, JSON.stringify(result), 'EX', this.ttl);
      return { result, replayed: false };
    } catch (err) {
      await this.redis.del(redisKey);
      throw err;
    }
  }
}
