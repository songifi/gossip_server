import { Injectable, ServiceUnavailableException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cron } from '@nestjs/schedule';
import { TokenPriceHistory } from '../entities/token-price-history.entity';

@Injectable()
export class PriceFeedService {
  private readonly ttl = 60;

  constructor(
    private readonly httpService: HttpService,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
    @InjectRepository(TokenPriceHistory)
    private readonly priceHistoryRepository: Repository<TokenPriceHistory>
  ) {}

  async getTokenPrice(symbol: string): Promise<number> {
    const cached = await this.cacheManager.get<number>(`price:${symbol}`);
    if (cached) return cached;

    let price = await this.fetchFromCoinGecko(symbol);
    if (!price) price = await this.fetchFromCoinMarketCap(symbol);
    if (!price) throw new ServiceUnavailableException('Unable to fetch token price');

    await this.cacheManager.set(`price:${symbol}`, price, this.ttl * 1000);
    return price;
  }

  private async fetchFromCoinGecko(symbol: string): Promise<number | null> {
    try {
      const { data } = await this.httpService.axiosRef.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
      );
      return data?.[symbol]?.usd || null;
    } catch {
      return null;
    }
  }

  private async fetchFromCoinMarketCap(symbol: string): Promise<number | null> {
    try {
      const { data } = await this.httpService.axiosRef.get(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
        {
          headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY }
        }
      );
      return data?.data?.[symbol]?.quote?.USD?.price || null;
    } catch {
      return null;
    }
  }

  @Cron('*/10 * * * *')
  async archivePrices() {
    const tokens = ['eth', 'btc', 'usdt'];
    for (const symbol of tokens) {
      const price = await this.getTokenPrice(symbol);
      await this.priceHistoryRepository.save({ symbol, price });
    }
  }

  @Cron('0 0 * * *')
  async pruneOldPrices() {
    await this.priceHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < NOW() - INTERVAL \'30 days\'')
      .execute();
  }
} 