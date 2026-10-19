import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MessagingModule,
    AccountsModule,
    PaymentsModule,
    WebhooksModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
