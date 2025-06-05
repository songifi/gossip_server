import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  salt?: string;
}

export interface MessageKeys {
  messageKey: string;
  keyId: string;
  timestamp: number;
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 16;
  private readonly pbkdf2Iterations = 100000;

  /**
   * Generate ECDH key pair for key exchange
   */
  generateECDHKeyPair(): KeyPair {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    
    return {
      publicKey: ecdh.getPublicKey('base64'),
      privateKey: ecdh.getPrivateKey('base64')
    };
  }

  /**
   * Perform ECDH key exchange to derive shared secret
   */
  deriveSharedSecret(privateKey: string, publicKey: string): string {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey, 'base64');
    const sharedSecret = ecdh.computeSecret(publicKey, 'base64');
    return sharedSecret.toString('base64');
  }

  /**
   * Derive encryption key using PBKDF2
   */
  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scrypt(password, salt, this.keyLength)) as Buffer;
  }

  /**
   * Generate a random message key with forward secrecy
   */
  generateMessageKey(): MessageKeys {
    const messageKey = crypto.randomBytes(this.keyLength).toString('base64');
    const keyId = crypto.randomUUID();
    
    return {
      messageKey,
      keyId,
      timestamp: Date.now()
    };
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encryptData(data: string, key: string, salt?: string): Promise<EncryptedData> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      let derivedKey: Buffer;

      if (salt) {
        const saltBuffer = Buffer.from(salt, 'base64');
        derivedKey = await this.deriveKey(key, saltBuffer);
      } else {
        derivedKey = Buffer.from(key, 'base64');
      }

      const cipher = crypto.createCipher(this.algorithm, derivedKey);
      cipher.setAAD(iv); // Additional authenticated data

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        salt: salt
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decryptData(encryptedData: EncryptedData, key: string): Promise<string> {
    try {
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');
      let derivedKey: Buffer;

      if (encryptedData.salt) {
        const saltBuffer = Buffer.from(encryptedData.salt, 'base64');
        derivedKey = await this.deriveKey(key, saltBuffer);
      } else {
        derivedKey = Buffer.from(key, 'base64');
      }

      const decipher = crypto.createDecipher(this.algorithm, derivedKey);
      decipher.setAAD(iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate salt for key derivation
   */
  generateSalt(): string {
    return crypto.randomBytes(this.saltLength).toString('base64');
  }

  /**
   * Encrypt file buffer
   */
  async encryptFile(fileBuffer: Buffer, key: string): Promise<EncryptedData> {
    const fileBase64 = fileBuffer.toString('base64');
    return this.encryptData(fileBase64, key);
  }

  /**
   * Decrypt file buffer
   */
  async decryptFile(encryptedData: EncryptedData, key: string): Promise<Buffer> {
    const decryptedBase64 = await this.decryptData(encryptedData, key);
    return Buffer.from(decryptedBase64, 'base64');
  }
}
