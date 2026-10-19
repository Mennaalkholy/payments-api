import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { IdempotencyService } from './idempotency.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AccountsModule, TransactionsModule, WebhooksModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, IdempotencyService],
})
export class PaymentsModule {}
