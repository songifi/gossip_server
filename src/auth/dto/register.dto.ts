import {
  IsString,
  IsOptional,
  IsEthereumAddress,
  Length,
  IsEmail,
} from 'class-validator';

export class RegisterDto {
  @IsEthereumAddress()
  walletAddress: string;

  @IsString()
  signature: string;

  @IsString()
  message: string;

  @IsString()
  @Length(3, 20)
  username: string;

  @IsString()
  avatar: string;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  bio?: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 100)
  password: string;
}
