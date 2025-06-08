import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletUtil } from '../common/utils/wallet.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      walletAddress,
      signature,
      message,
      username,
      avatar,
      bio,
      email,
      password,
    } = registerDto;

    if (!WalletUtil.verifySignature(message, signature, walletAddress)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const user = await this.userService.create({
      walletAddress,
      username,
      avatar,
      bio,
      email,
      password,
    });

    const tokens = await this.generateTokens(user.walletAddress);
    await this.userService.updateRefreshToken(
      user.walletAddress,
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    // Remove sensitive data from response
    const { password: _, refreshToken: __, ...userResponse } = user;
    return {
      user: userResponse,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { walletAddress, signature, message } = loginDto;

    if (!WalletUtil.verifySignature(message, signature, walletAddress)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const user = await this.userService.findByWallet(walletAddress);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.walletAddress);
    await this.userService.updateRefreshToken(
      user.walletAddress,
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    // Remove sensitive data from response
    const { password, refreshToken, ...userResponse } = user;
    return {
      user: userResponse,
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      const user = await this.userService.findByWallet(payload.walletAddress);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateTokens(user.walletAddress);
      await this.userService.updateRefreshToken(
        user.walletAddress,
        await bcrypt.hash(tokens.refreshToken, 10),
      );

      return tokens;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async logout(walletAddress: string) {
    await this.userService.removeRefreshToken(walletAddress);
  }

  private async generateTokens(walletAddress: string) {
    const payload = { walletAddress };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
        expiresIn: '7d',
      }),
    };
  }

  getNonce(): string {
    return WalletUtil.generateNonce();
  }

  getSignMessage(walletAddress: string): string {
    const nonce = this.getNonce();
    return WalletUtil.createSignMessage(walletAddress, nonce);
  }
}
