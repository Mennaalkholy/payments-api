import { ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import { IdempotencyService } from './idempotency.service';

/** Minimal in-memory stand-in for the Redis commands we use */
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    async set(key: string, value: string, ...args: unknown[]) {
      if (args.includes('NX') && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
  };
}

describe('IdempotencyService', () => {
  it('executes once and replays the stored result', async () => {
    const redis = fakeRedis();
    const svc = new IdempotencyService(redis as unknown as Redis);
    const fn = jest.fn().mockResolvedValue({ paymentId: 'p1' });

    const first = await svc.execute('k1', fn);
    const second = await svc.execute('k1', fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ result: { paymentId: 'p1' }, replayed: false });
    expect(second).toEqual({ result: { paymentId: 'p1' }, replayed: true });
  });

  it('rejects a concurrent request with the same key', async () => {
    const redis = fakeRedis();
    const svc = new IdempotencyService(redis as unknown as Redis);
    let release!: () => void;
    const slow = () => new Promise<string>((r) => (release = () => r('done')));

    const p1 = svc.execute('k2', slow);
    await expect(svc.execute('k2', slow)).rejects.toBeInstanceOf(ConflictException);
    release();
    await expect(p1).resolves.toEqual({ result: 'done', replayed: false });
  });

  it('releases the key when the operation fails so it can be retried', async () => {
    const redis = fakeRedis();
    const svc = new IdempotencyService(redis as unknown as Redis);
    await expect(svc.execute('k3', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(redis.store.has('idem:k3')).toBe(false);
  });
});
