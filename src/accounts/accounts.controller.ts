import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, DepositDto } from './dto';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly transactions: TransactionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Get(':id/balance')
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.getBalance(id);
  }

  @Post(':id/deposits')
  async deposit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DepositDto) {
    const tx = await this.transactions.credit(id, dto.amount, 'deposit');
    await this.accounts.invalidateBalance(id);
    return tx;
  }

  @Get(':id/transactions')
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactions.list(id);
  }
}
