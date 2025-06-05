import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchHistory } from './entities/search-history.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { buildFullTextQuery, buildFilters } from './strategies/full-text.strategy';
import { rankResults } from './utils/ranking.utils';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(SearchHistory)
    private historyRepo: Repository<SearchHistory>,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async search(query: SearchQueryDto) {
    const cacheKey = `search:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await buildFullTextQuery(query);
    const filtered = buildFilters(results, query);
    const ranked = rankResults(filtered);

    await this.historyRepo.save({ query: query.q });
    await this.cache.set(cacheKey, ranked, 300); // TTL 5 minutes
    return ranked;
  }

  async getSuggestions(term: string) {
    return this.historyRepo
      .createQueryBuilder('h')
      .where('h.query ILIKE :term', { term: `%${term}%` })
      .groupBy('h.query')
      .select('h.query')
      .limit(10)
      .getRawMany();
  }

  async getTrendingSearches() {
    return this.historyRepo
      .createQueryBuilder('h')
      .select('h.query, COUNT(*) AS count')
      .groupBy('h.query')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
  }
}
