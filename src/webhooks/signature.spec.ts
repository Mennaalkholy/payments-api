import { sign, verify } from './signature';

describe('webhook signature', () => {
  const secret = 'shh';
  const body = JSON.stringify({ hello: 'world' });

  it('accepts a valid signature', () => {
    expect(verify(body, sign(body, secret), secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verify(body + ' ', sign(body, secret), secret)).toBe(false);
  });

  it('rejects the wrong secret', () => {
    expect(verify(body, sign(body, 'other'), secret)).toBe(false);
  });

  it('rejects a missing or malformed header', () => {
    expect(verify(body, undefined, secret)).toBe(false);
    expect(verify(body, 'garbage', secret)).toBe(false);
  });

  it('rejects stale timestamps (replay protection)', () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(verify(body, sign(body, secret, old), secret)).toBe(false);
  });
});
