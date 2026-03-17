import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceResponseDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  availableBalance!: string;

  @ApiProperty()
  heldBalance!: string;
}

export class FundWalletResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  balance!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  transactionId!: string;
}
