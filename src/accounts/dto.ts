import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export class DepositDto {
  /** Amount in minor units (cents) */
  @IsInt()
  @Min(1)
  amount: number;
}
