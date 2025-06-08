import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/auth.decorator';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { User } from './entities/user.entity';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    // Remove sensitive data
    const { password, refreshToken, ...userProfile } = user;
    return userProfile;
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.userService.updateProfile(
      user.walletAddress,
      updateProfileDto,
    );
    const { password, refreshToken, ...userProfile } = updatedUser;
    return userProfile;
  }
}
