import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const existingWallet = await this.userRepository.findOne({
      where: { walletAddress: userData.walletAddress },
    });

    if (existingWallet) {
      throw new ConflictException('Wallet address already exists');
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username: userData.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const existingEmail = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByWallet(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  async updateRefreshToken(
    walletAddress: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userRepository.update({ walletAddress }, { refreshToken });
  }

  async updateProfile(
    walletAddress: string,
    updateData: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findByWallet(walletAddress);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await this.userRepository.findOne({
        where: { username: updateData.username },
      });
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateData.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    await this.userRepository.update({ walletAddress }, updateData);
    return this.findByWallet(walletAddress);
  }

  async removeRefreshToken(walletAddress: string): Promise<void> {
    await this.userRepository.update({ walletAddress }, { refreshToken: null });
  }
}
