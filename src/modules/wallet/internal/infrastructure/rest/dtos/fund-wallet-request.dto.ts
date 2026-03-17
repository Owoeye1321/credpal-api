import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class FundWalletRequestDto {
  @ApiProperty({ example: 50000, description: 'Amount in NGN to fund' })
  @IsNumber()
  @IsPositive()
  amount!: number;
}
