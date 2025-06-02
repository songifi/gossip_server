import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BlockchainService {
  private readonly ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';

  constructor(private httpService: HttpService) {}

  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}&tag=latest&apikey=${this.ETHERSCAN_API_KEY}`
        )
      );
      
      return parseInt(response.data.result) / Math.pow(10, 18); // Assuming 18 decimals
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
    }
  }

  async getEthBalance(walletAddress: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.etherscan.io/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${this.ETHERSCAN_API_KEY}`
        )
      );
      
      return parseInt(response.data.result) / Math.pow(10, 18);
    } catch (error) {
      console.error('Failed to get ETH balance:', error);
      return 0;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.COINGECKO_API}/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`
        )
      );
      
      return response.data[tokenAddress.toLowerCase()]?.usd || 0;
    } catch (error) {
      console.error('Failed to get token price:', error);
      return 0;
    }
  }

  async getTransactionHistory(walletAddress: string, page: number = 1): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=100&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`
        )
      );
      
      return response.data.result || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  async getTokenTransfers(walletAddress: string, tokenAddress?: string): Promise<any[]> {
    try {
      const url = tokenAddress 
        ? `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${walletAddress}&page=1&offset=100&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`
        : `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&page=1&offset=100&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`;
      
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data.result || [];
    } catch (error) {
      console.error('Failed to get token transfers:', error);
      return [];
    }
  }
}
