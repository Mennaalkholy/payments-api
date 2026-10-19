import { backoffDelay, WebhookDispatcher } from './webhook-dispatcher.service';

const res = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;

describe('WebhookDispatcher', () => {
  it('retries 5xx with backoff and succeeds', async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(res(503)).mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(res(200));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const d = new WebhookDispatcher('http://hook', 'secret', 5, sleep, fetchFn);

    await expect(d.dispatch('payment.created', { id: 1 })).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][1].headers['x-signature']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it('gives up after maxAttempts', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(500));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const d = new WebhookDispatcher('http://hook', 's', 3, sleep, fetchFn);
    await expect(d.dispatch('x', {})).resolves.toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(400));
    const d = new WebhookDispatcher('http://hook', 's', 5, jest.fn(), fetchFn);
    await expect(d.dispatch('x', {})).resolves.toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('backoff grows exponentially and is capped', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(backoffDelay(0)).toBeLessThan(500);
    expect(backoffDelay(3)).toBeGreaterThan(3000);
    expect(backoffDelay(20)).toBeLessThanOrEqual(30_000);
    jest.restoreAllMocks();
  });
});
