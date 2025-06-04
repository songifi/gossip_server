import { Injectable, Logger } from '@nestjs/common';
import { CryptoService, EncryptedData } from './crypto.service';
import { KeyManagementService } from './key-management.service';

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: EncryptedData;
  keyId: string;
  timestamp: Date;
  encryptionStatus: 'encrypted' | 'failed' | 'decrypted';
  hasAttachments: boolean;
}

export interface EncryptedAttachment {
  id: string;
  messageId: string;
  filename: string;
  encryptedData: EncryptedData;
  keyId: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly keyManagementService: KeyManagementService
  ) {}

  /**
   * Encrypt message for transmission
   */
  async encryptMessage(
    senderId: string,
    recipientId: string,
    content: string,
    senderPassword: string
  ): Promise<EncryptedMessage> {
    try {
      // Get sender's private key and recipient's public key
      const senderPrivateKey = await this.keyManagementService.getUserPrivateKey(
        senderId,
        senderPassword
      );
      const recipientPublicKey = await this.keyManagementService.getUserPublicKey(
        recipientId
      );

      // Derive shared secret using ECDH
      const sharedSecret = this.cryptoService.deriveSharedSecret(
        senderPrivateKey,
        recipientPublicKey
      );

      // Generate message key with forward secrecy
      const messageKeys = await this.keyManagementService.generateMessageKey(
        senderId,
        sharedSecret
      );

      // Encrypt message content
      const encryptedContent = await this.cryptoService.encryptData(
        content,
        messageKeys.messageKey
      );

      return {
        id: crypto.randomUUID(),
        senderId,
        recipientId,
        encryptedContent,
        keyId: messageKeys.keyId,
        timestamp: new Date(),
        encryptionStatus: 'encrypted',
        hasAttachments: false
      };
    } catch (error) {
      this.logger.error('Message encryption failed', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt message for reading
   */
  async decryptMessage(
    encryptedMessage: EncryptedMessage,
    userId: string,
    userPassword: string
  ): Promise<string> {
    try {
      // Determine if user is sender or recipient
      const isRecipient = encryptedMessage.recipientId === userId;
      const isSender = encryptedMessage.senderId === userId;

      if (!isRecipient && !isSender) {
        throw new Error('Unauthorized to decrypt message');
      }

      // Get user's private key
      const userPrivateKey = await this.keyManagementService.getUserPrivateKey(
        userId,
        userPassword
      );

      // Get the other party's public key
      const otherUserId = isRecipient ? encryptedMessage.senderId : encryptedMessage.recipientId;
      const otherUserPublicKey = await this.keyManagementService.getUserPublicKey(otherUserId);

      // Derive shared secret
      const sharedSecret = this.cryptoService.deriveSharedSecret(
        userPrivateKey,
        otherUserPublicKey
      );

      // Get message key
      const messageKey = await this.keyManagementService.getMessageKey(
        encryptedMessage.keyId,
        encryptedMessage.senderId,
        sharedSecret
      );

      // Decrypt message content
      const decryptedContent = await this.cryptoService.decryptData(
        encryptedMessage.encryptedContent,
        messageKey
      );

      return decryptedContent;
    } catch (error) {
      this.logger.error('Message decryption failed', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Encrypt file attachment
   */
  async encryptAttachment(
    messageId: string,
    filename: string,
    fileBuffer: Buffer,
    mimeType: string,
    messageKey: string
  ): Promise<EncryptedAttachment> {
    try {
      const encryptedData = await this.cryptoService.encryptFile(fileBuffer, messageKey);

      return {
        id: crypto.randomUUID(),
        messageId,
        filename,
        encryptedData,
        keyId: messageId, // Use message ID as key reference
        mimeType,
        size: fileBuffer.length
      };
    } catch (error) {
      this.logger.error('File encryption failed', error);
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file attachment
   */
  async decryptAttachment(
    encryptedAttachment: EncryptedAttachment,
    messageKey: string
  ): Promise<Buffer> {
    try {
      return this.cryptoService.decryptFile(encryptedAttachment.encryptedData, messageKey);
    } catch (error) {
      this.logger.error('File decryption failed', error);
      throw new Error('File decryption failed');
    }
  }

  /**
   * Get encryption status for a message
   */
  getEncryptionStatus(encryptedMessage: EncryptedMessage): {
    isEncrypted: boolean;
    algorithm: string;
    keyExchange: string;
    forwardSecrecy: boolean;
  } {
    return {
      isEncrypted: encryptedMessage.encryptionStatus === 'encrypted',
      algorithm: 'AES-256-GCM',
      keyExchange: 'ECDH',
      forwardSecrecy: true
    };
  }
}
