import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto, CreateCustomReactionDto } from './dto/create-reaction.dto';
import { ReactionQueryDto } from './dto/reaction-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReactionPermissionGuard } from './guards/reaction-permission.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @UseGuards(ReactionPermissionGuard)
  @ApiOperation({ summary: 'Add reaction to message' })
  async createReaction(
    @CurrentUser() user: User,
    @Body() createReactionDto: CreateReactionDto,
  ) {
    return this.reactionsService.createReaction(user.id, createReactionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove reaction' })
  async removeReaction(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reactionsService.removeReaction(user.id, id);
  }

  @Get('message/:messageId')
  @ApiOperation({ summary: 'Get message reactions with aggregation' })
  async getMessageReactions(
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.reactionsService.getMessageReactions(messageId);
  }

  @Post('custom')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create custom reaction' })
  async createCustomReaction(
    @CurrentUser() user: User,
    @Body() createCustomReactionDto: CreateCustomReactionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reactionsService.createCustomReaction(
      user.id,
      createCustomReactionDto,
      file,
    );
  }

  @Get('custom')
  @ApiOperation({ summary: 'Get custom reactions' })
  async getCustomReactions(@Query() query: ReactionQueryDto) {
    return this.reactionsService.getCustomReactions(query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user reactions' })
  async getUserReactions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ReactionQueryDto,
  ) {
    return this.reactionsService.getUserReactions(userId, query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get reaction analytics' })
  async getReactionAnalytics(
    @Query('messageId') messageId?: string,
    @Query('period') period?: string,
  ) {
    return this.reactionsService.getReactionAnalytics(messageId, period);
  }
}