import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AccountsService } from '../accounts/accounts.service';
import { EVENTS_CLIENT } from '../messaging/messaging.module';
import { TransactionsService } from '../transactions/transactions.service';
import { WebhookDispatcher } from '../webhooks/webhook-dispatcher.service';
import { CreatePaymentDto, PaymentCreatedEvent } from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly transactions: TransactionsService,
    private readonly accounts: AccountsService,
    private readonly webhooks: WebhookDispatcher,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
  ) {}

  async create(dto: CreatePaymentDto): Promise<PaymentCreatedEvent> {
    const tx = await this.transactions.debit(dto.accountId, dto.amount, dto.description ?? 'payment');
    await this.accounts.invalidateBalance(dto.accountId);

    const event: PaymentCreatedEvent = {
      paymentId: tx.id,
      accountId: tx.accountId,
      amount: tx.amount,
      createdAt: tx.createdAt.toISOString(),
    };
    // Fire-and-forget: the payment is committed; event delivery must not fail the request.
    this.events.emit('payment.created', event).subscribe({
      error: (err: Error) => this.logger.error(`Failed to publish payment.created: ${err.message}`),
    });
    void this.webhooks.dispatch('payment.created', event);
    return event;
  }
}
