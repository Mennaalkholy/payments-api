import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { WebhookDispatcher } from '../webhooks/webhook-dispatcher.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('debits, invalidates cache, publishes payment.created and dispatches webhook', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const transactions = { debit: jest.fn().mockResolvedValue({ id: 't1', accountId: 'a1', amount: 250, createdAt }) };
    const accounts = { invalidateBalance: jest.fn() };
    const webhooks = { dispatch: jest.fn().mockResolvedValue(true) };
    const events = { emit: jest.fn().mockReturnValue(of(undefined)) };

    const svc = new PaymentsService(
      transactions as unknown as TransactionsService,
      accounts as unknown as AccountsService,
      webhooks as unknown as WebhookDispatcher,
      events as unknown as ClientProxy,
    );
    const event = await svc.create({ accountId: 'a1', amount: 250 });

    expect(event).toEqual({ paymentId: 't1', accountId: 'a1', amount: 250, createdAt: createdAt.toISOString() });
    expect(transactions.debit).toHaveBeenCalledWith('a1', 250, 'payment');
    expect(accounts.invalidateBalance).toHaveBeenCalledWith('a1');
    expect(events.emit).toHaveBeenCalledWith('payment.created', event);
    expect(webhooks.dispatch).toHaveBeenCalledWith('payment.created', event);
  });
});
