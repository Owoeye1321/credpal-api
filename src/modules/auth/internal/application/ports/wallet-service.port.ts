export interface IWalletService {
  createWallet(userId: string): Promise<void>;
}
