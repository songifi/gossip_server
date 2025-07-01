import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { EncryptedData } from "../interfaces/encryption.interface";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";

  /**
   * Encrypts data using AES-256-GCM
   */
  encrypt(data: string, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from("additional-data"));

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypts data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from("additional-data"));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Generates a random key for AES encryption
   */
  generateKey(): Buffer {
    return crypto.randomBytes(32); // 256 bits
  }

  /**
   * Derives a key using PBKDF2
   */
  deriveKey(password: string, salt: Buffer, iterations = 100000): Buffer {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  }

  /**
   * Generates a random salt
   */
  generateSalt(): Buffer {
    return crypto.randomBytes(16);
  }
}
