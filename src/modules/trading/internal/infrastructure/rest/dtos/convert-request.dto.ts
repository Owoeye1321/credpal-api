import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ConvertRequestDto {
  @ApiProperty({ example: 'EUR', description: 'Currency to convert from' })
  @IsString()
  @IsNotEmpty()
  fromCurrency!: string;

  @ApiProperty({ example: 'GBP', description: 'Currency to convert to' })
  @IsString()
  @IsNotEmpty()
  toCurrency!: string;

  @ApiProperty({ example: 50, description: 'Amount to convert' })
  @IsNumber()
  @IsPositive()
  amount!: number;
}
