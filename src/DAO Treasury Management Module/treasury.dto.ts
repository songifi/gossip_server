import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsDate, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalType, ProposalStatus } from './treasury.entity';

export class CreateTreasuryDto {
  @IsString()
  groupChatId: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  multiSigAddress: string;

  @IsArray()
  signatories: string[];

  @IsNumber()
  @Min(1)
  requiredSignatures: number;

  @IsString()
  governanceTokenAddress: string;
}

export class CreateProposalDto {
  @IsString()
  treasuryId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(ProposalType)
  type: ProposalType;

  @IsString()
  proposer: string;

  @IsOptional()
  executionData?: any;

  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @IsOptional()
  @IsString()
  requestedTokenAddress?: string;

  @IsDate()
  @Type(() => Date)
  votingStartTime: Date;

  @IsDate()
  @Type(() => Date)
  votingEndTime: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredApprovalPercentage?: number;
}

export class CastVoteDto {
  @IsString()
  proposalId: string;

  @IsString()
  voter: string;

  @IsBoolean()
  support: boolean;

  @IsNumber()
  votingPower: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateBudgetAllocationDto {
  @IsString()
  treasuryId: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  allocatedAmount: number;

  @IsString()
  tokenAddress: string;

  @IsString()
  tokenSymbol: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;
}
