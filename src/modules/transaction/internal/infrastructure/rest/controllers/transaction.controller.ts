import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../../core/decorators/current-user.decorator';
import { JwtPayload } from '../../../../../../core/guards/jwt.strategy';
import { TransactionService } from '../../../application/services/transaction.service';
import { TransactionQueryDto } from '../dtos/transaction-query.dto';
import { TransactionListResponseDto } from '../dtos/transaction-response.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiResponse({ status: 200, type: TransactionListResponseDto })
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionListResponseDto> {
    const result = await this.transactionService.getTransactions({
      userId: user.sub,
      type: query.type,
      status: query.status,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return {
      data: result.data.map((t) => ({ ...t })),
      meta: result.meta,
    };
  }
}
