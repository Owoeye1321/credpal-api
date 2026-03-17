import { ApiProperty } from '@nestjs/swagger';

export class FxRateResponseDto {
  @ApiProperty()
  baseCurrency!: string;

  @ApiProperty()
  targetCurrency!: string;

  @ApiProperty()
  rate!: string;

  @ApiProperty()
  inverseRate!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  fetchedAt!: Date;

  @ApiProperty()
  isStale!: boolean;
}
