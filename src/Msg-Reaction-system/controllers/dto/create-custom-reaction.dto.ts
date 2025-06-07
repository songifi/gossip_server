import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class CreateCustomReactionDto {
  @IsString()
  name: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}
