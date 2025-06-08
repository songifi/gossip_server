import { ethers } from 'ethers';

export class WalletUtil {
  static verifySignature(
    message: string,
    signature: string,
    address: string,
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  static generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  static createSignMessage(walletAddress: string, nonce: string): string {
    return `Please sign this message to authenticate with your wallet.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  }
}
