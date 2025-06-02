import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Body, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { FileService } from '../services/file.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
  };
}

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: ['image', 'document', 'audio'],
        },
        messageId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
        encryptionKey: {
          type: 'string',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Req() req: RequestWithUser,
  ) {
    return this.fileService.uploadFile(file, dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file by ID' })
  async getFile(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.fileService.getFile(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.fileService.deleteFile(id, req.user.id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all files uploaded by a user' })
  async getFilesByUser(@Param('userId') userId: string) {
    return this.fileService.getFilesByUser(userId);
  }

  @Get('message/:messageId')
  @ApiOperation({ summary: 'Get all files attached to a message' })
  async getFilesByMessage(@Param('messageId') messageId: string) {
    return this.fileService.getFilesByMessage(messageId);
  }
} 