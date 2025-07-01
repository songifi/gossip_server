import { IsString, IsNotEmpty } from "class-validator";

export class InitiateKeyExchangeDto {
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class CompleteKeyExchangeDto {
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsString()
  @IsNotEmpty()
  keyExchangeId: string;
}
