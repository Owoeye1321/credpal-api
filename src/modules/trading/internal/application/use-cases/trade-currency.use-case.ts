import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FxRateService } from '../../../../fx/internal/application/services/fx-rate.service';
import { IWalletRepository } from '../../../../wallet/internal/application/ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../../../../wallet/internal/application/ports/wallet-balance-repository.port';
import { TradeParams } from '../../domain/types/trade-params.type';
import { TradeResult } from '../../domain/types/trade-result.type';
import { WalletNotFoundError } from '../../../../wallet/internal/domain/errors/wallet-not-found.error';
import { InsufficientBalanceError } from '../../../../wallet/internal/domain/errors/insufficient-balance.error';
import { StaleRateError } from '../../../../fx/internal/domain/errors/stale-rate.error';
import { Currency } from '../../../../wallet/internal/domain/enums/currency.enum';
import { Money } from '../../../../wallet/internal/domain/value-objects/money.vo';
import {
  multiply,
  subtract,
  add,
  isGreaterThanOrEqual,
} from '../../../../../core/utils/decimal.util';
import { TransactionOrmEntity } from '../../../../../core/database/typeorm/entities/transaction.orm-entity';
import { LedgerEntryOrmEntity } from '../../../../../core/database/typeorm/entities/ledger-entry.orm-entity';

@Injectable()
export class TradeCurrencyUseCase {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    @Inject('IWalletBalanceRepository')
    private readonly walletBalanceRepository: IWalletBalanceRepository,
    private readonly fxRateService: FxRateService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(params: TradeParams): Promise<TradeResult> {
    Money.create(params.amount, params.currency);

    const wallet = await this.walletRepository.findByUserId(params.userId);
    if (!wallet) throw new WalletNotFoundError();

    const isBuy = params.action === 'BUY';
    const foreignCurrency = params.currency.toUpperCase();
    const amountStr = String(params.amount);

    const ratePair = await this.fxRateService.getRate(
      Currency.NGN,
      foreignCurrency,
    );

    if (ratePair.isStale) throw new StaleRateError();

    // BUY foreign: debit NGN, credit foreign
    // SELL foreign: debit foreign, credit NGN
    const sourceCurrency = isBuy ? Currency.NGN : foreignCurrency;
    const targetCurrency = isBuy ? foreignCurrency : Currency.NGN;

    let sourceAmount: string;
    let targetAmount: string;

    if (isBuy) {
      // BUY 100 USD: sourceAmount (NGN) = 100 * inverseRate (NGN/USD)
      targetAmount = amountStr;
      sourceAmount = multiply(amountStr, ratePair.inverseRate);
    } else {
      // SELL 100 USD: sourceAmount = 100 USD, targetAmount = 100 * rate
      sourceAmount = amountStr;
      targetAmount = multiply(amountStr, ratePair.rate);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Lock and validate source balance
      const sourceBalance =
        await this.walletBalanceRepository.findAndLockForUpdate(
          wallet.id,
          sourceCurrency,
          queryRunner,
        );

      if (
        !sourceBalance ||
        !isGreaterThanOrEqual(sourceBalance.availableBalance, sourceAmount)
      ) {
        throw new InsufficientBalanceError();
      }

      // Get or create target balance
      let targetBalance =
        await this.walletBalanceRepository.findAndLockForUpdate(
          wallet.id,
          targetCurrency,
          queryRunner,
        );

      if (!targetBalance) {
        targetBalance =
          await this.walletBalanceRepository.createWithQueryRunner(
            wallet.id,
            targetCurrency,
            queryRunner,
          );
      }

      const newSourceBalance = subtract(
        sourceBalance.availableBalance,
        sourceAmount,
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
        type: 'TRADE',
        status: 'COMPLETED',
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        targetAmount,
        exchangeRate: ratePair.rate,
        fee: '0.0000',
        metadata: {
          action: params.action,
          rateFetchedAt: ratePair.fetchedAt,
          ...(params.recipientWalletId && { recipientWalletId: params.recipientWalletId }),
        },
        completedAt: now,
      });
      const savedTx = await queryRunner.manager.save(transaction);

      // Debit ledger entry
      await queryRunner.manager.save(
        queryRunner.manager.create(LedgerEntryOrmEntity, {
          walletBalanceId: sourceBalance.id,
          transactionId: savedTx.id,
          type: 'DEBIT',
          amount: sourceAmount,
          balanceAfter: newSourceBalance,
          description: `${params.action} ${params.amount} ${foreignCurrency} - debit ${sourceCurrency}`,
        }),
      );

      // Credit ledger entry
      await queryRunner.manager.save(
        queryRunner.manager.create(LedgerEntryOrmEntity, {
          walletBalanceId: targetBalance.id,
          transactionId: savedTx.id,
          type: 'CREDIT',
          amount: targetAmount,
          balanceAfter: newTargetBalance,
          description: `${params.action} ${params.amount} ${foreignCurrency} - credit ${targetCurrency}`,
        }),
      );

      await queryRunner.commitTransaction();

      return {
        transactionId: savedTx.id,
        type: 'TRADE',
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        targetAmount,
        exchangeRate: ratePair.rate,
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
