import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { rmqOptions } from './messaging/messaging.module';

async function bootstrap() {
  // rawBody is required for HMAC verification of inbound webhooks
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableShutdownHooks();

  // Hybrid app: the same process also consumes RabbitMQ events (notifications)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: { ...rmqOptions(), noAck: false },
  });
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
