import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const EVENTS_CLIENT = 'EVENTS_CLIENT';

export const rmqOptions = () => ({
  urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
  queue: process.env.RABBITMQ_QUEUE ?? 'payments_events',
  queueOptions: { durable: true },
});

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      { name: EVENTS_CLIENT, useFactory: () => ({ transport: Transport.RMQ, options: rmqOptions() }) },
    ]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
