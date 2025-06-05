import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchHistory } from './entities/search-history.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([SearchHistory]),
    CacheModule.register({ ttl: 300 }) // 5-minute TTL
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
