import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../../../core/guards/jwt-auth.guard';
import { IdempotencyInterceptor } from '../../../../../../core/interceptors/idempotency.interceptor';
import { CurrentUser } from '../../../../../../core/decorators/current-user.decorator';
import { JwtPayload } from '../../../../../../core/guards/jwt.strategy';
import { TradingService } from '../../../application/services/trading.service';
import { TradeRequestDto } from '../dtos/trade-request.dto';
import { ConvertRequestDto } from '../dtos/convert-request.dto';
import { TradeResponseDto } from '../dtos/trade-response.dto';

@ApiTags('Trading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('trade')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Trade NGN against foreign currency' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key for idempotent request',
  })
  @ApiResponse({ status: 200, type: TradeResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid trade' })
  @ApiResponse({ status: 409, description: 'Stale exchange rate' })
  async trade(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TradeRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<TradeResponseDto> {
    return this.tradingService.trade({
      userId: user.sub,
      action: dto.action,
      currency: dto.currency,
      amount: dto.amount,
      idempotencyKey,
      recipientWalletId: dto.recipientWalletId,
    });
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Convert between non-NGN currencies' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key for idempotent request',
  })
  @ApiResponse({ status: 200, type: TradeResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance or same currency' })
  @ApiResponse({ status: 409, description: 'Stale exchange rate' })
  async convert(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConvertRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<TradeResponseDto> {
    return this.tradingService.convert({
      userId: user.sub,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      amount: dto.amount,
      idempotencyKey,
    });
  }
}
