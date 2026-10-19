import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentCreatedEvent } from '../payments/dto';

/** RabbitMQ consumer. Replace the log line with email/SMS/push delivery. */
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  @EventPattern('payment.created')
  handlePaymentCreated(@Payload() event: PaymentCreatedEvent, @Ctx() ctx: RmqContext): void {
    this.logger.log(`Notify owner of account ${event.accountId}: payment ${event.paymentId} for ${event.amount}`);
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
  }
}
