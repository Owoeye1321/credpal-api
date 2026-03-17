import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { WalletService } from '../../../../src/modules/wallet/internal/application/services/wallet.service';
import { IWalletRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-balance-repository.port';
import { WalletEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet.entity';
import { WalletBalanceEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet-balance.entity';
import { WalletNotFoundError } from '../../../../src/modules/wallet/internal/domain/errors/wallet-not-found.error';
import { DomainException } from '../../../../src/core/exceptions/domain.exception';

function createMockQueryRunner() {
  const mockManager = {
    create: jest.fn().mockImplementation((_entity: any, data: any) => ({
      id: faker.string.uuid(),
      ...data,
    })),
    save: jest.fn().mockImplementation((entity: any) =>
      Promise.resolve({ id: entity.id || faker.string.uuid(), ...entity }),
    ),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  } as unknown as jest.Mocked<DataSource>;

  return { mockDataSource, mockQueryRunner, mockManager };
}

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<IWalletRepository>;
  let walletBalanceRepository: jest.Mocked<IWalletBalanceRepository>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>['mockQueryRunner'];
  let mockDataSource: ReturnType<typeof createMockQueryRunner>['mockDataSource'];

  const userId = faker.string.uuid();
  const walletId = faker.string.uuid();
  const balanceId = faker.string.uuid();

  const wallet = WalletEntity.create({
    id: walletId,
    userId,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const existingBalance = WalletBalanceEntity.create({
    id: balanceId,
    walletId,
    currency: 'NGN',
    availableBalance: '5000.0000',
    heldBalance: '0.0000',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const qr = createMockQueryRunner();
    mockQueryRunner = qr.mockQueryRunner;
    mockDataSource = qr.mockDataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: 'IWalletRepository',
          useValue: { findByUserId: jest.fn(), create: jest.fn() },
        },
        {
          provide: 'IWalletBalanceRepository',
          useValue: {
            findByWalletId: jest.fn(),
            findByWalletIdAndCurrency: jest.fn(),
            findAndLockForUpdate: jest.fn(),
            createWithQueryRunner: jest.fn(),
            updateBalance: jest.fn(),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get('IWalletRepository');
    walletBalanceRepository = module.get('IWalletBalanceRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should call walletRepository.create with userId', async () => {
      const uid = faker.string.uuid();
      const w = WalletEntity.create({
        id: faker.string.uuid(),
        userId: uid,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      walletRepository.create.mockResolvedValue(w);

      await service.createWallet(uid);

      expect(walletRepository.create).toHaveBeenCalledWith(uid);
    });
  });

  describe('getBalances', () => {
    it('should return balances when wallet exists and has balances', async () => {
      const balances = [
        WalletBalanceEntity.create({
          id: faker.string.uuid(),
          walletId,
          currency: 'NGN',
          availableBalance: '10000.0000',
          heldBalance: '0.0000',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findByWalletId.mockResolvedValue(balances);

      const result = await service.getBalances(userId);

      expect(result).toEqual(balances);
      expect(walletRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(walletBalanceRepository.findByWalletId).toHaveBeenCalledWith(walletId);
    });

    it('should throw WalletNotFoundError when wallet does not exist', async () => {
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.getBalances(faker.string.uuid()),
      ).rejects.toThrow(WalletNotFoundError);
    });

    it('should return default zero balances for all currencies when no balances exist', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findByWalletId.mockResolvedValue([]);

      const result = await service.getBalances(userId);

      expect(result).toHaveLength(4);
      const currencies = result.map((b) => b.currency);
      expect(currencies).toContain('NGN');
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');

      for (const balance of result) {
        expect(balance.availableBalance).toBe('0.0000');
        expect(balance.heldBalance).toBe('0.0000');
        expect(balance.walletId).toBe(walletId);
      }
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully when balance exists', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(existingBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await service.fundWallet({ userId, amount: 1000 });

      expect(result.message).toBe('Wallet funded successfully');
      expect(result.balance).toBe('6000.0000');
      expect(result.currency).toBe('NGN');
      expect(result.transactionId).toBeDefined();

      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
      expect(walletBalanceRepository.updateBalance).toHaveBeenCalledWith(
        balanceId,
        '6000.0000',
        mockQueryRunner,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create a new balance when none exists', async () => {
      const newBalance = WalletBalanceEntity.create({
        id: faker.string.uuid(),
        walletId,
        currency: 'NGN',
        availableBalance: '0.0000',
        heldBalance: '0.0000',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(null);
      walletBalanceRepository.createWithQueryRunner.mockResolvedValue(newBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await service.fundWallet({ userId, amount: 500 });

      expect(walletBalanceRepository.createWithQueryRunner).toHaveBeenCalledWith(
        walletId,
        'NGN',
        mockQueryRunner,
      );
      expect(result.balance).toBe('500.0000');
    });

    it('should throw WalletNotFoundError when wallet not found', async () => {
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.fundWallet({ userId, amount: 100 }),
      ).rejects.toThrow(WalletNotFoundError);
    });

    it('should throw DomainException for zero amount', async () => {
      await expect(
        service.fundWallet({ userId, amount: 0 }),
      ).rejects.toThrow(DomainException);
    });

    it('should throw DomainException for negative amount', async () => {
      await expect(
        service.fundWallet({ userId, amount: -100 }),
      ).rejects.toThrow(DomainException);
    });

    it('should rollback transaction on error', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(existingBalance);
      walletBalanceRepository.updateBalance.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.fundWallet({ userId, amount: 100 }),
      ).rejects.toThrow('DB error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should save transaction with correct type FUNDING and status COMPLETED', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(existingBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      await service.fundWallet({ userId, amount: 100 });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'FUNDING',
          status: 'COMPLETED',
          sourceCurrency: 'NGN',
        }),
      );
    });

    it('should save ledger entry with type CREDIT', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(existingBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      await service.fundWallet({ userId, amount: 100 });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'CREDIT',
          amount: '100',
        }),
      );
    });

    it('should include idempotencyKey when provided', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(existingBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const idempotencyKey = faker.string.uuid();
      await service.fundWallet({ userId, amount: 100, idempotencyKey });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ idempotencyKey }),
      );
    });
  });
});
