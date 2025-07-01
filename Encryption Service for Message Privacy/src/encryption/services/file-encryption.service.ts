import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { EncryptionService } from "./encryption.service";
import { KeyManagementService } from "./key-management.service";
import { EncryptedData } from "../interfaces/encryption.interface";

@Injectable()
export class FileEncryptionService {
  constructor(
    private encryptionService: EncryptionService,
    private keyManagementService: KeyManagementService
  ) {}

  /**
   * Encrypts file data
   */
  async encryptFile(
    fileBuffer: Buffer,
    conversationId: string
  ): Promise<{ encryptedData: EncryptedData; fileKey: string }> {
    // Generate dedicated key for file
    const fileKey =
      this.keyManagementService.generateMessageKey(conversationId);

    // Convert buffer to base64 for encryption
    const fileBase64 = fileBuffer.toString("base64");

    // Encrypt file data
    const encryptedData = this.encryptionService.encrypt(
      fileBase64,
      fileKey.key
    );
    encryptedData.keyId = fileKey.keyId;

    return { encryptedData, fileKey: fileKey.keyId };
  }

  /**
   * Decrypts file data
   */
  async decryptFile(encryptedData: EncryptedData): Promise<Buffer> {
    if (!encryptedData.keyId) {
      throw new Error("File key ID not found");
    }

    const fileKey = this.keyManagementService.getMessageKey(
      encryptedData.keyId
    );

    if (!fileKey) {
      throw new Error("File encryption key not found or expired");
    }

    // Decrypt file data
    const decryptedBase64 = this.encryptionService.decrypt(
      encryptedData,
      fileKey.key
    );

    // Convert back to buffer
    return Buffer.from(decryptedBase64, "base64");
  }

  /**
   * Encrypts file metadata
   */
  encryptFileMetadata(metadata: any, keyId: string): EncryptedData {
    const messageKey = this.keyManagementService.getMessageKey(keyId);

    if (!messageKey) {
      throw new Error("Encryption key not found");
    }

    const metadataStr = JSON.stringify(metadata);
    return this.encryptionService.encrypt(metadataStr, messageKey.key);
  }

  /**
   * Decrypts file metadata
   */
  decryptFileMetadata(encryptedData: EncryptedData, keyId: string): any {
    const messageKey = this.keyManagementService.getMessageKey(keyId);

    if (!messageKey) {
      throw new Error("Encryption key not found");
    }

    const metadataStr = this.encryptionService.decrypt(
      encryptedData,
      messageKey.key
    );
    return JSON.parse(metadataStr);
  }
}
