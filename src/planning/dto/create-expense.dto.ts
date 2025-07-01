import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  receipt?: string;

  @IsUUID()
  eventId: string;
}