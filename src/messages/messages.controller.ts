import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from './entities/message.entity';
import { RequestWithUser } from './interfaces/request.interface';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Request() req: RequestWithUser, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(req.user.id, createMessageDto);
  }

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.messagesService.findAll(req.user.id, page, limit, search);
  }

  @Get(':id')
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.messagesService.findOne(id, req.user.id);
  }

  @Post(':id/status')
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body('status') status: MessageStatus,
  ) {
    return this.messagesService.updateStatus(id, status, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.messagesService.remove(id, req.user.id);
  }

  @Get('thread/:parentMessageId')
  getThread(@Request() req: RequestWithUser, @Param('parentMessageId') parentMessageId: string) {
    return this.messagesService.getThread(parentMessageId, req.user.id);
  }
}
