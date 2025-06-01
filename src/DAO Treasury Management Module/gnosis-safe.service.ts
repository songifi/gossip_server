import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GnosisSafeService {
  constructor(private httpService: HttpService) {}

  async getSafeInfo(safeAddress: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://safe-transaction-mainnet.safe.global/api/v1/safes/${safeAddress}/`)
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Safe info: ${error.message}`);
    }
  }

  async getPendingTransactions(safeAddress: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://safe-transaction-mainnet.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/?executed=false`)
      );
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to fetch pending transactions: ${error.message}`);
    }
  }

  async proposeTransaction(safeAddress: string, transactionData: any): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://safe-transaction-mainnet.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/`,
          transactionData
        )
      );
      return response.data.safeTxHash;
    } catch (error) {
      throw new Error(`Failed to propose transaction: ${error.message}`);
    }
  }

  async confirmTransaction(safeAddress: string, safeTxHash: string, signature: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `https://safe-transaction-mainnet.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/${safeTxHash}/confirmations/`,
          { signature }
        )
      );
    } catch (error) {
      throw new Error(`Failed to confirm transaction: ${error.message}`);
    }
  }
}
