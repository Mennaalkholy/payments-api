import { Injectable, Logger } from '@nestjs/common';
import { sign } from './signature';

export type Sleep = (ms: number) => Promise<void>;
const defaultSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function backoffDelay(attempt: number, baseMs = 500, maxMs = 30_000): number {
  // Exponential backoff with full jitter: random(0, min(max, base * 2^attempt))
  return Math.floor(Math.random() * Math.min(maxMs, baseMs * 2 ** attempt));
}

/**
 * Sends signed outgoing webhooks, retrying 5xx / network errors with exponential backoff.
 * In-process for simplicity; a production version would use a durable queue (see README).
 */
@Injectable()
export class WebhookDispatcher {
  private readonly logger = new Logger(WebhookDispatcher.name);

  constructor(
    private readonly url = process.env.WEBHOOK_OUTBOUND_URL ?? '',
    private readonly secret = process.env.WEBHOOK_OUTBOUND_SECRET ?? '',
    private readonly maxAttempts = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 5),
    private readonly sleep: Sleep = defaultSleep,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async dispatch(type: string, data: unknown): Promise<boolean> {
    if (!this.url) return false;
    const body = JSON.stringify({ type, data });
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const res = await this.fetchFn(this.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-signature': sign(body, this.secret) },
          body,
        });
        if (res.ok) return true;
        if (res.status < 500 && res.status !== 429) {
          this.logger.warn(`Webhook rejected with ${res.status}; not retrying`);
          return false;
        }
      } catch (err) {
        this.logger.warn(`Webhook attempt ${attempt + 1} failed: ${(err as Error).message}`);
      }
      if (attempt < this.maxAttempts - 1) await this.sleep(backoffDelay(attempt));
    }
    this.logger.error(`Webhook ${type} gave up after ${this.maxAttempts} attempts`);
    return false;
  }
}
