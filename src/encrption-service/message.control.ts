import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface SendMessageDto {
  recipientId: string;
  content: string;
  password: string;
}

interface DecryptMessageDto {
  messageId: string;
  password: string;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly keyManagementService: KeyManagementService
  ) {}

  @Post('send')
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    const { recipientId, content, password } = sendMessageDto;
    const senderId = req.user.id;

    try {
      const encryptedMessage = await this.encryptionService.encryptMessage(
        senderId,
        recipientId,
        content,
        password
      );

      // Here you would save the encrypted message to your database
      
      return {
        success: true,
        messageId: encryptedMessage.id,
        encryptionStatus: this.encryptionService.getEncryptionStatus(encryptedMessage)
      };
    } catch (error) {
      throw new BadRequestException('Failed to encrypt and send message');
    }
  }

  @Post('decrypt')
  async decryptMessage(@Body() decryptMessageDto: DecryptMessageDto, @Request() req) {
    const { messageId, password } = decryptMessageDto;
    const userId = req.user.id;

    try {
      // Here you would retrieve the encrypted message from your database
      const encryptedMessage = await this.getEncryptedMessageFromDatabase(messageId);
      
      const decryptedContent = await this.encryptionService.decryptMessage(
        encryptedMessage,
        userId,
        password
      );

      return {
        success: true,
        content: decryptedContent,
        timestamp: encryptedMessage.timestamp
      };
    } catch (error) {
      throw new BadRequestException('Failed to decrypt message');
    }
  }

  @Post('upload-attachment/:messageId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('messageId') messageId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('messageKey') messageKey: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const encryptedAttachment = await this.encryptionService.encryptAttachment(
        messageId,
        file.originalname,
        file.buffer,
        file.mimetype,
        messageKey
      );

      // Here you would save the encrypted attachment to your database
      
      return {
        success: true,
        attachmentId: encryptedAttachment.id,
        filename: encryptedAttachment.filename,
        size: encryptedAttachment.size
      };
    } catch (error) {
      throw new BadRequestException('Failed to encrypt and upload attachment');
    }
  }

  @Post('keys/generate')
  async generateKeys(@Body('password') password: string, @Request() req) {
    const userId = req.user.id;

    try {
      const keyPair = await this.keyManagementService.generateUserKeyPair(userId, password);
      
      return {
        success: true,
        publicKey: keyPair.publicKey,
        createdAt: keyPair.createdAt
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate key pair');
    }
  }

  @Post('keys/rotate')
  async rotateKeys(@Body('password') password: string, @Request() req) {
    const userId = req.user.id;

    try {
      const newKeyPair = await this.keyManagementService.rotateUserKeys(userId, password);
      
      return {
        success: true,
        publicKey: newKeyPair.publicKey,
        rotatedAt: newKeyPair.createdAt
      };
    } catch (error) {
      throw new BadRequestException('Failed to rotate keys');
    }
  }

  @Get('keys/rotation-status')
  async getKeyRotationStatus(@Request() req) {
    const userId = req.user.id;

    try {
      const needsRotation = await this.keyManagementService.isKeyRotationNeeded(userId);
      
      return {
        needsRotation,
        recommendation: needsRotation ? 'Key rotation recommended' : 'Keys are current'
      };
    } catch (error) {
      throw new BadRequestException('Failed to check key rotation status');
    }
  }

  private async getEncryptedMessageFromDatabase(messageId: string) {
    // This is a placeholder - implement your database retrieval logic here
    // Return the encrypted message from your database
    throw new Error('Database retrieval not implemented');
  }
}
