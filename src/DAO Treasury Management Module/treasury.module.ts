import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import {
  Treasury,
  TreasuryBalance,
  Proposal,
  Vote,
  TreasuryTransaction,
  BudgetAllocation
} from './treasury.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Treasury,
      TreasuryBalance,
      Proposal,
      Vote,
      TreasuryTransaction,
      BudgetAllocation
    ]),
    HttpModule,
    ScheduleModule.forRoot()
  ],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService]
})
export class TreasuryModule {}
