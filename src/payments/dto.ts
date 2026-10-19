import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  accountId: string;

  /** Amount in minor units (cents) */
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export interface PaymentCreatedEvent {
  paymentId: string;
  accountId: string;
  amount: number;
  createdAt: string;
}
