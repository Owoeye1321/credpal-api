import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString, ValidateIf } from 'class-validator';

export class TradeRequestDto {
  @ApiProperty({ enum: ['BUY', 'SELL'], example: 'BUY' })
  @IsEnum(['BUY', 'SELL'])
  @IsNotEmpty()
  action!: 'BUY' | 'SELL';

  @ApiProperty({ example: 'USD', description: 'Foreign currency to trade' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ example: 100, description: 'Amount of foreign currency' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Recipient wallet ID (required for SELL)' })
  @ValidateIf((o) => o.action === 'SELL')
  @IsString()
  @IsNotEmpty()
  recipientWalletId?: string;
}
