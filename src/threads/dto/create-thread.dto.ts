import { IsString, IsOptional, IsArray, IsEnum, MaxLength, IsUUID } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class ThreadSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds?: string[];

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  offset?: number = 0;
}
