import { ApiProperty } from '@nestjs/swagger';

export class TradeResponseDto {
  @ApiProperty()
  transactionId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  sourceCurrency!: string;

  @ApiProperty()
  targetCurrency!: string;

  @ApiProperty()
  sourceAmount!: string;

  @ApiProperty()
  targetAmount!: string;

  @ApiProperty()
  exchangeRate!: string;

  @ApiProperty()
  fee!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  completedAt!: Date;
}
