import {
  Body,
  Controller,
  Get,
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
import { WalletService } from '../../../application/services/wallet.service';
import { FundWalletRequestDto } from '../dtos/fund-wallet-request.dto';
import {
  WalletBalanceResponseDto,
  FundWalletResponseDto,
} from '../dtos/wallet-response.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get all currency balances' })
  @ApiResponse({ status: 200, type: [WalletBalanceResponseDto] })
  async getBalances(
    @CurrentUser() user: JwtPayload,
  ): Promise<WalletBalanceResponseDto[]> {
    const balances = await this.walletService.getBalances(user.sub);
    return balances.map((b) => ({
      currency: b.currency,
      availableBalance: b.availableBalance,
      heldBalance: b.heldBalance,
    }));
  }

  @Post('fund')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Fund wallet in NGN' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key for idempotent request',
  })
  @ApiResponse({ status: 200, type: FundWalletResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid amount' })
  async fund(
    @CurrentUser() user: JwtPayload,
    @Body() dto: FundWalletRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<FundWalletResponseDto> {
    return this.walletService.fundWallet({
      userId: user.sub,
      amount: dto.amount,
      idempotencyKey,
    });
  }
}
