export interface WalletBalanceProps {
  id: string;
  walletId: string;
  currency: string;
  availableBalance: string;
  heldBalance: string;
  createdAt: Date;
  updatedAt: Date;
}
