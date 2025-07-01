import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class EncryptMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class DecryptMessageDto {
  @IsString()
  @IsNotEmpty()
  encryptedContent: string;

  @IsString()
  @IsNotEmpty()
  iv: string;

  @IsString()
  @IsNotEmpty()
  authTag: string;

  @IsString()
  @IsNotEmpty()
  keyId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
