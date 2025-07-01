import { Injectable } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { KeyManagementService } from "./key-management.service";
import { KeyExchangeService } from "./key-exchange.service";
import {
  EncryptedData,
  EncryptionStatus,
} from "../interfaces/encryption.interface";

@Injectable()
export class MessageEncryptionService {
  constructor(
    private encryptionService: EncryptionService,
    private keyManagementService: KeyManagementService,
    private keyExchangeService: KeyExchangeService
  ) {}

  /**
   * Encrypts a message for storage
   */
  async encryptMessage(
    content: string,
    conversationId: string,
    senderId: string,
    recipientId: string
  ): Promise<{ encryptedData: EncryptedData; status: EncryptionStatus }> {
    // Generate or get message key with forward secrecy
    const messageKey =
      this.keyManagementService.generateMessageKey(conversationId);

    // Encrypt the message content
    const encryptedData = this.encryptionService.encrypt(
      content,
      messageKey.key
    );
    encryptedData.keyId = messageKey.keyId;

    const status: EncryptionStatus = {
      isEncrypted: true,
      algorithm: "AES-256-GCM",
      keyId: messageKey.keyId,
      encryptedAt: new Date(),
    };

    return { encryptedData, status };
  }

  /**
   * Decrypts a message
   */
  async decryptMessage(
    encryptedData: EncryptedData,
    userId: string
  ): Promise<string> {
    if (!encryptedData.keyId) {
      throw new Error("Key ID not found in encrypted data");
    }

    const messageKey = this.keyManagementService.getMessageKey(
      encryptedData.keyId
    );

    if (!messageKey) {
      throw new Error("Message key not found or expired");
    }

    return this.encryptionService.decrypt(encryptedData, messageKey.key);
  }

  /**
   * Gets encryption status for a message
   */
  getEncryptionStatus(keyId: string): EncryptionStatus | null {
    const messageKey = this.keyManagementService.getMessageKey(keyId);

    if (!messageKey) {
      return null;
    }

    return {
      isEncrypted: true,
      algorithm: "AES-256-GCM",
      keyId: messageKey.keyId,
      encryptedAt: messageKey.createdAt,
    };
  }

  /**
   * Rotates message encryption key
   */
  rotateMessageKey(conversationId: string, oldKeyId: string): string {
    const newMessageKey = this.keyManagementService.rotateMessageKey(
      oldKeyId,
      conversationId
    );
    return newMessageKey.keyId;
  }
}
