import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { KeyExchangeService } from "../services/key-exchange.service";
import { MessageEncryptionService } from "../services/message-encryption.service";
import { FileEncryptionService } from "../services/file-encryption.service";
import {
  InitiateKeyExchangeDto,
  CompleteKeyExchangeDto,
  EncryptMessageDto,
  DecryptMessageDto,
} from "../dto";

@Controller("encryption")
export class EncryptionController {
  constructor(
    private keyExchangeService: KeyExchangeService,
    private messageEncryptionService: MessageEncryptionService,
    private fileEncryptionService: FileEncryptionService
  ) {}

  @Post("key-exchange/initiate")
  async initiateKeyExchange(@Body() dto: InitiateKeyExchangeDto) {
    const exchangeId = this.keyExchangeService.initiateKeyExchange(
      dto.userId,
      dto.publicKey
    );

    return {
      exchangeId,
      message: "Key exchange initiated",
    };
  }

  @Post("key-exchange/complete")
  async completeKeyExchange(@Body() dto: CompleteKeyExchangeDto) {
    const sharedSecret = this.keyExchangeService.completeKeyExchange(
      dto.keyExchangeId,
      dto.publicKey
    );

    return {
      keyId: sharedSecret.keyId,
      message: "Key exchange completed",
    };
  }

  @Post("messages/encrypt")
  async encryptMessage(@Body() dto: EncryptMessageDto) {
    const result = await this.messageEncryptionService.encryptMessage(
      dto.content,
      dto.conversationId || `${dto.senderId}-${dto.recipientId}`,
      dto.senderId,
      dto.recipientId
    );

    return {
      encryptedContent: result.encryptedData.encryptedData,
      iv: result.encryptedData.iv,
      authTag: result.encryptedData.authTag,
      keyId: result.encryptedData.keyId,
      status: result.status,
    };
  }

  @Post("messages/decrypt")
  async decryptMessage(@Body() dto: DecryptMessageDto) {
    const encryptedData = {
      encryptedData: dto.encryptedContent,
      iv: dto.iv,
      authTag: dto.authTag,
      keyId: dto.keyId,
    };

    const decryptedContent = await this.messageEncryptionService.decryptMessage(
      encryptedData,
      dto.userId
    );

    return {
      content: decryptedContent,
    };
  }

  @Get("messages/:keyId/status")
  async getEncryptionStatus(@Param("keyId") keyId: string) {
    const status = this.messageEncryptionService.getEncryptionStatus(keyId);

    if (!status) {
      throw new BadRequestException("Encryption status not found");
    }

    return status;
  }

  @Post("messages/:conversationId/rotate-key")
  async rotateMessageKey(
    @Param("conversationId") conversationId: string,
    @Body("oldKeyId") oldKeyId: string
  ) {
    const newKeyId = this.messageEncryptionService.rotateMessageKey(
      conversationId,
      oldKeyId
    );

    return {
      newKeyId,
      message: "Message key rotated successfully",
    };
  }

  @Post("files/encrypt")
  @UseInterceptors(FileInterceptor("file"))
  async encryptFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("conversationId") conversationId: string
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.fileEncryptionService.encryptFile(
      file.buffer,
      conversationId
    );

    return {
      encryptedData: result.encryptedData.encryptedData,
      iv: result.encryptedData.iv,
      authTag: result.encryptedData.authTag,
      fileKeyId: result.fileKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post("files/decrypt")
  async decryptFile(@Body() body: any) {
    const encryptedData = {
      encryptedData: body.encryptedData,
      iv: body.iv,
      authTag: body.authTag,
      keyId: body.fileKeyId,
    };

    const decryptedBuffer = await this.fileEncryptionService.decryptFile(
      encryptedData
    );

    return {
      data: decryptedBuffer.toString("base64"),
      size: decryptedBuffer.length,
    };
  }
}
