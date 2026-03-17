import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IWalletRepository } from '../ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../ports/wallet-balance-repository.port';
import { IWalletService } from '../../../../auth/internal/application/ports/wallet-service.port';
import { WalletNotFoundError } from '../../domain/errors/wallet-not-found.error';
import { CurrencyNotSupportedError } from '../../domain/errors/currency-not-supported.error';
import { WalletBalanceEntity } from '../../domain/entities/wallet-balance.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Currency } from '../../domain/enums/currency.enum';
import { FundWalletParams } from '../../domain/types/fund-wallet-params.type';
import { add } from '../../../../../core/utils/decimal.util';
import { TransactionOrmEntity } from '../../../../../core/database/typeorm/entities/transaction.orm-entity';
import { LedgerEntryOrmEntity } from '../../../../../core/database/typeorm/entities/ledger-entry.orm-entity';

@Injectable()
export class WalletService implements IWalletService {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    @Inject('IWalletBalanceRepository')
    private readonly walletBalanceRepository: IWalletBalanceRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createWallet(userId: string): Promise<void> {
    await this.walletRepository.create(userId);
  }

  async getBalances(userId: string): Promise<WalletBalanceEntity[]> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new WalletNotFoundError();
    }

    const balances = await this.walletBalanceRepository.findByWalletId(
      wallet.id,
    );

    if (balances.length === 0) {
      const defaultCurrencies = Object.values(Currency);
      return defaultCurrencies.map((currency) =>
        WalletBalanceEntity.create({
          id: '',
          walletId: wallet.id,
          currency,
          availableBalance: '0.0000',
          heldBalance: '0.0000',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    }

    return balances;
  }

  async fundWallet(params: FundWalletParams): Promise<{
    message: string;
    balance: string;
    currency: string;
    transactionId: string;
  }> {
    const money = Money.create(params.amount, Currency.NGN);

    if (money.currency !== Currency.NGN) {
      throw new CurrencyNotSupportedError(money.currency);
    }

    const wallet = await this.walletRepository.findByUserId(params.userId);
    if (!wallet) {
      throw new WalletNotFoundError();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      let balance = await this.walletBalanceRepository.findAndLockForUpdate(
        wallet.id,
        Currency.NGN,
        queryRunner,
      );

      if (!balance) {
        balance = await this.walletBalanceRepository.createWithQueryRunner(
          wallet.id,
          Currency.NGN,
          queryRunner,
        );
      }

      const newBalance = add(balance.availableBalance, money.amount);

      await this.walletBalanceRepository.updateBalance(
        balance.id,
        newBalance,
        queryRunner,
      );

      const transaction = queryRunner.manager.create(TransactionOrmEntity, {
        userId: params.userId,
        idempotencyKey: params.idempotencyKey || null,
        type: 'FUNDING',
        status: 'COMPLETED',
        sourceCurrency: Currency.NGN,
        targetCurrency: null,
        sourceAmount: money.amount,
        targetAmount: null,
        exchangeRate: null,
        exchangeRateId: null,
        fee: '0.0000',
        metadata: null,
        completedAt: new Date(),
      });
      const savedTransaction = await queryRunner.manager.save(transaction);

      const ledgerEntry = queryRunner.manager.create(LedgerEntryOrmEntity, {
        walletBalanceId: balance.id,
        transactionId: savedTransaction.id,
        type: 'CREDIT',
        amount: money.amount,
        balanceAfter: newBalance,
        description: `NGN funding of ${money.amount}`,
      });
      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      return {
        message: 'Wallet funded successfully',
        balance: newBalance,
        currency: Currency.NGN,
        transactionId: savedTransaction.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
