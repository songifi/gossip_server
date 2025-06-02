// src/modules/portfolio/dto/portfolio.dto.ts
import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, IsDateString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePortfolioDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string = 'USD';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialBalance?: number = 0;
}

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;
}

export class PortfolioPerformanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650) // Max 10 years
  days?: number = 30;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PortfolioComparisonDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  portfolioIds: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number = 30;
}

export class PortfolioAnalyticsDto {
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  interval?: 'daily' | 'weekly' | 'monthly' = 'daily';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number = 30;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PortfolioRebalanceDto {
  @IsArray()
  targets: PortfolioRebalanceTarget[];
}

export class PortfolioRebalanceTarget {
  @IsUUID()
  assetTypeId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  targetPercentage: number;
}

export class PortfolioAllocationDto {
  @IsOptional()
  @IsEnum(['value', 'quantity'])
  groupBy?: 'value' | 'quantity' = 'value';

  @IsOptional()
  @IsEnum(['assetType', 'sector', 'country'])
  category?: 'assetType' | 'sector' | 'country' = 'assetType';
}

export class PortfolioRiskMetricsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(1825) // Max 5 years
  days?: number = 252; // 1 year trading days

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  riskFreeRate?: number = 0.02; // 2% default risk-free rate

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  confidenceLevel?: number = 0.95; // 95% confidence level
}