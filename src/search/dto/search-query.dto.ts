import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';

export enum SearchType {
  MESSAGE = 'message',
  USER = 'user',
  GROUP = 'group',
  TRANSACTION = 'transaction',
}

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @IsOptional()
  @IsString()
  transactionType?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
