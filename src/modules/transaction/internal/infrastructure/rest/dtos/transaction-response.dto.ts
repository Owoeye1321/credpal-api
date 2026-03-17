import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  sourceCurrency!: string;

  @ApiPropertyOptional()
  targetCurrency!: string | null;

  @ApiProperty()
  sourceAmount!: string;

  @ApiPropertyOptional()
  targetAmount!: string | null;

  @ApiPropertyOptional()
  exchangeRate!: string | null;

  @ApiProperty()
  fee!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  completedAt!: Date | null;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionItemDto] })
  data!: TransactionItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
