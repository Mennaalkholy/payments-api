import { BadRequestException, Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreatePaymentDto } from './dto';
import { IdempotencyService } from './idempotency.service';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatePaymentDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!key || key.length > 255) {
      throw new BadRequestException('Idempotency-Key header is required (max 255 chars)');
    }
    const { result, replayed } = await this.idempotency.execute(key, () => this.payments.create(dto));
    res.setHeader('Idempotent-Replayed', String(replayed));
    return result;
  }
}
