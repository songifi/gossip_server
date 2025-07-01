import { IsString, IsDateString, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  totalCost?: number;

  @IsOptional()
  @IsBoolean()
  costSharingEnabled?: boolean;

  @IsUUID()
  groupChatId: string;
}