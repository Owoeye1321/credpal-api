import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../../../core/guards/jwt-auth.guard';
import { FxRateService } from '../../../application/services/fx-rate.service';
import { FxRateQueryDto } from '../dtos/fx-rate-query.dto';
import { FxRateResponseDto } from '../dtos/fx-rates-response.dto';

@ApiTags('FX Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fx')
export class FxController {
  constructor(private readonly fxRateService: FxRateService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get current FX rates' })
  @ApiResponse({ status: 200, type: [FxRateResponseDto] })
  @ApiResponse({ status: 503, description: 'FX rates unavailable' })
  async getRates(
    @Query() query: FxRateQueryDto,
  ): Promise<FxRateResponseDto[]> {
    return this.fxRateService.getRates(query.base, query.target);
  }
}
