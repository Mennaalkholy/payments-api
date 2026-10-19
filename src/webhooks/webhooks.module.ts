import { Module } from '@nestjs/common';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [{ provide: WebhookDispatcher, useFactory: () => new WebhookDispatcher() }],
  exports: [WebhookDispatcher],
})
export class WebhooksModule {}
