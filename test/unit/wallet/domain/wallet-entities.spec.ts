import { faker } from '@faker-js/faker';
import { WalletEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet.entity';
import { WalletBalanceEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet-balance.entity';
import { WalletProps } from '../../../../src/modules/wallet/internal/domain/types/wallet-props.type';
import { WalletBalanceProps } from '../../../../src/modules/wallet/internal/domain/types/wallet-balance-props.type';

function createWalletProps(overrides: Partial<WalletProps> = {}): WalletProps {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: 'ACTIVE',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

function createWalletBalanceProps(
  overrides: Partial<WalletBalanceProps> = {},
): WalletBalanceProps {
  return {
    id: faker.string.uuid(),
    walletId: faker.string.uuid(),
    currency: 'NGN',
    availableBalance: '10000.0000',
    heldBalance: '0.0000',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

describe('WalletEntity', () => {
  describe('create', () => {
    it('should create a WalletEntity from valid props', () => {
      const props = createWalletProps();
      const wallet = WalletEntity.create(props);
      expect(wallet).toBeInstanceOf(WalletEntity);
    });
  });

  describe('properties', () => {
    it('should return correct id', () => {
      const props = createWalletProps();
      const wallet = WalletEntity.create(props);
      expect(wallet.id).toBe(props.id);
    });

    it('should return correct userId', () => {
      const props = createWalletProps();
      const wallet = WalletEntity.create(props);
      expect(wallet.userId).toBe(props.userId);
    });

    it('should return correct status', () => {
      const wallet = WalletEntity.create(createWalletProps({ status: 'ACTIVE' }));
      expect(wallet.status).toBe('ACTIVE');
    });

    it('should return correct createdAt and updatedAt', () => {
      const props = createWalletProps();
      const wallet = WalletEntity.create(props);
      expect(wallet.createdAt).toEqual(props.createdAt);
      expect(wallet.updatedAt).toEqual(props.updatedAt);
    });
  });
});

describe('WalletBalanceEntity', () => {
  describe('create', () => {
    it('should create a WalletBalanceEntity from valid props', () => {
      const props = createWalletBalanceProps();
      const balance = WalletBalanceEntity.create(props);
      expect(balance).toBeInstanceOf(WalletBalanceEntity);
    });
  });

  describe('properties', () => {
    it('should return correct id and walletId', () => {
      const props = createWalletBalanceProps();
      const balance = WalletBalanceEntity.create(props);
      expect(balance.id).toBe(props.id);
      expect(balance.walletId).toBe(props.walletId);
    });

    it('should return correct currency', () => {
      const balance = WalletBalanceEntity.create(
        createWalletBalanceProps({ currency: 'USD' }),
      );
      expect(balance.currency).toBe('USD');
    });

    it('should return correct availableBalance and heldBalance', () => {
      const props = createWalletBalanceProps({
        availableBalance: '5000.0000',
        heldBalance: '100.0000',
      });
      const balance = WalletBalanceEntity.create(props);
      expect(balance.availableBalance).toBe('5000.0000');
      expect(balance.heldBalance).toBe('100.0000');
    });

    it('should return correct dates', () => {
      const props = createWalletBalanceProps();
      const balance = WalletBalanceEntity.create(props);
      expect(balance.createdAt).toEqual(props.createdAt);
      expect(balance.updatedAt).toEqual(props.updatedAt);
    });
  });
});
