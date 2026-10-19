import { Controller, Headers, HttpCode, Logger, Post, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { verify } from './signature';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  /** Inbound webhook from a provider. Verified against the raw body, not re-serialised JSON. */
  @Post('inbound')
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<Request>, @Headers('x-signature') signature?: string) {
    const raw = req.rawBody?.toString('utf8') ?? '';
    if (!verify(raw, signature, process.env.WEBHOOK_INBOUND_SECRET ?? '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    this.logger.log(`Verified inbound webhook: ${raw.slice(0, 200)}`);
    return { received: true };
  }
}
