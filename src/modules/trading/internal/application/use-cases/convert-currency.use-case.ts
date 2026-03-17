import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FxRateService } from '../../../../fx/internal/application/services/fx-rate.service';
import { IWalletRepository } from '../../../../wallet/internal/application/ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../../../../wallet/internal/application/ports/wallet-balance-repository.port';
import { ConversionParams } from '../../domain/types/conversion-params.type';
import { TradeResult } from '../../domain/types/trade-result.type';
import { WalletNotFoundError } from '../../../../wallet/internal/domain/errors/wallet-not-found.error';
import { InsufficientBalanceError } from '../../../../wallet/internal/domain/errors/insufficient-balance.error';
import { StaleRateError } from '../../../../fx/internal/domain/errors/stale-rate.error';
import { SameCurrencyError } from '../../domain/errors/same-currency.error';
import { Money } from '../../../../wallet/internal/domain/value-objects/money.vo';
import { Currency } from '../../../../wallet/internal/domain/enums/currency.enum';
import {
  multiply,
  divide,
  subtract,
  add,
  isGreaterThanOrEqual,
} from '../../../../../core/utils/decimal.util';
import { TransactionOrmEntity } from '../../../../../core/database/typeorm/entities/transaction.orm-entity';
import { LedgerEntryOrmEntity } from '../../../../../core/database/typeorm/entities/ledger-entry.orm-entity';

@Injectable()
export class ConvertCurrencyUseCase {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    @Inject('IWalletBalanceRepository')
    private readonly walletBalanceRepository: IWalletBalanceRepository,
    private readonly fxRateService: FxRateService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(params: ConversionParams): Promise<TradeResult> {
    const from = params.fromCurrency.toUpperCase();
    const to = params.toCurrency.toUpperCase();

    if (from === to) throw new SameCurrencyError();

    Money.create(params.amount, from);

    const wallet = await this.walletRepository.findByUserId(params.userId);
    if (!wallet) throw new WalletNotFoundError();

    const amountStr = String(params.amount);

    let targetAmount: string;
    let exchangeRate: string;
    let metadata: Record<string, unknown> | null = null;

    if (from === Currency.NGN) {
      // Direct: NGN → foreign (single rate lookup)
      const rate = await this.fxRateService.getRate(Currency.NGN, to);
      if (rate.isStale) throw new StaleRateError();
      targetAmount = multiply(amountStr, rate.rate);
      exchangeRate = rate.rate;
    } else if (to === Currency.NGN) {
      // Direct: foreign → NGN (single rate lookup)
      const rate = await this.fxRateService.getRate(Currency.NGN, from);
      if (rate.isStale) throw new StaleRateError();
      targetAmount = multiply(amountStr, rate.inverseRate);
      exchangeRate = rate.inverseRate;
    } else {
      // Cross-pair: bridge via NGN (e.g., USD → EUR = USD → NGN → EUR)
      const fromRate = await this.fxRateService.getRate(Currency.NGN, from);
      const toRate = await this.fxRateService.getRate(Currency.NGN, to);
      if (fromRate.isStale || toRate.isStale) throw new StaleRateError();

      const ngnAmount = multiply(amountStr, fromRate.inverseRate);
      targetAmount = multiply(ngnAmount, toRate.rate);
      exchangeRate = divide(targetAmount, amountStr);
      metadata = {
        bridgeCurrency: Currency.NGN,
        fromToNgnRate: fromRate.inverseRate,
        ngnToToRate: toRate.rate,
      };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const sourceBalance =
        await this.walletBalanceRepository.findAndLockForUpdate(
          wallet.id,
          from,
          queryRunner,
        );

      if (
        !sourceBalance ||
        !isGreaterThanOrEqual(sourceBalance.availableBalance, amountStr)
      ) {
        throw new InsufficientBalanceError();
      }

      let targetBalance =
        await this.walletBalanceRepository.findAndLockForUpdate(
          wallet.id,
          to,
          queryRunner,
        );

      if (!targetBalance) {
        targetBalance =
          await this.walletBalanceRepository.createWithQueryRunner(
            wallet.id,
            to,
            queryRunner,
          );
      }

      const newSourceBalance = subtract(
        sourceBalance.availableBalance,
        amountStr,
      );
      const newTargetBalance = add(
        targetBalance.availableBalance,
        targetAmount,
      );

      await this.walletBalanceRepository.updateBalance(
        sourceBalance.id,
        newSourceBalance,
        queryRunner,
      );
      await this.walletBalanceRepository.updateBalance(
        targetBalance.id,
        newTargetBalance,
        queryRunner,
      );

      const now = new Date();
      const transaction = queryRunner.manager.create(TransactionOrmEntity, {
        userId: params.userId,
        idempotencyKey: params.idempotencyKey || null,
        type: 'CONVERSION',
        status: 'COMPLETED',
        sourceCurrency: from,
        targetCurrency: to,
        sourceAmount: amountStr,
        targetAmount,
        exchangeRate,
        fee: '0.0000',
        metadata,
        completedAt: now,
      });
      const savedTx = await queryRunner.manager.save(transaction);

      await queryRunner.manager.save(
        queryRunner.manager.create(LedgerEntryOrmEntity, {
          walletBalanceId: sourceBalance.id,
          transactionId: savedTx.id,
          type: 'DEBIT',
          amount: amountStr,
          balanceAfter: newSourceBalance,
          description: `Convert ${params.amount} ${from} to ${to} - debit`,
        }),
      );

      await queryRunner.manager.save(
        queryRunner.manager.create(LedgerEntryOrmEntity, {
          walletBalanceId: targetBalance.id,
          transactionId: savedTx.id,
          type: 'CREDIT',
          amount: targetAmount,
          balanceAfter: newTargetBalance,
          description: `Convert ${params.amount} ${from} to ${to} - credit`,
        }),
      );

      await queryRunner.commitTransaction();

      return {
        transactionId: savedTx.id,
        type: 'CONVERSION',
        sourceCurrency: from,
        targetCurrency: to,
        sourceAmount: amountStr,
        targetAmount,
        exchangeRate,
        fee: '0.0000',
        status: 'COMPLETED',
        completedAt: now,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
