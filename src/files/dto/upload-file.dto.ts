import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FileType } from '../entities/file.entity';

export class UploadFileDto {
  @IsEnum(FileType)
  type: FileType;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
} 