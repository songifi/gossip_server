import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { MediaService } from '../services/media.service';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  
  @Controller('events/media')
  @UseGuards(JwtAuthGuard)
  export class MediaController {
    constructor(private readonly mediaService: MediaService) {}
  
    @Post(':eventId/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadMedia(
      @Param('eventId') eventId: string,
      @UploadedFile() file: Express.Multer.File,
      @Body('caption') caption: string,
      @Request() req,
    ) {
      if (!file) {
        throw new BadRequestException('File is required');
      }
  
      return this.mediaService.uploadMedia(eventId, file, caption, req.user);
    }
  
    @Get('event/:eventId')
    getEventMedia(@Param('eventId') eventId: string) {
      return this.mediaService.getEventMedia(eventId);
    }
  }