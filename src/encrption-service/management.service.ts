import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService, KeyPair, MessageKeys } from './crypto.service';

export interface UserKeyPair {
  userId: string;
  publicKey: string;
  privateKey: string; // This should be encrypted with user's password
  createdAt: Date;
  isActive: boolean;
}

export interface MessageKeyRecord {
  keyId: string;
  userId: string;
  encryptedMessageKey: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);
  private readonly keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
  private readonly messageKeyTTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly cryptoService: CryptoService,
    @InjectRepository(UserKeyPair)
    private readonly userKeyRepository: Repository<UserKeyPair>,
    @InjectRepository(MessageKeyRecord)
    private readonly messageKeyRepository: Repository<MessageKeyRecord>
  ) {}

  /**
   * Generate and store user key pair
   */
  async generateUserKeyPair(userId: string, password: string): Promise<UserKeyPair> {
    const keyPair = this.cryptoService.generateECDHKeyPair();
    const salt = this.cryptoService.generateSalt();
    
    // Encrypt private key with user's password
    const encryptedPrivateKey = await this.cryptoService.encryptData(
      keyPair.privateKey,
      password,
      salt
    );

    const userKeyPair: UserKeyPair = {
      userId,
      publicKey: keyPair.publicKey,
      privateKey: JSON.stringify(encryptedPrivateKey),
      createdAt: new Date(),
      isActive: true
    };

    return this.userKeyRepository.save(userKeyPair);
  }

  /**
   * Get user's decrypted private key
   */
  async getUserPrivateKey(userId: string, password: string): Promise<string> {
    const userKeyPair = await this.userKeyRepository.findOne({
      where: { userId, isActive: true }
    });

    if (!userKeyPair) {
      throw new Error('User key pair not found');
    }

    const encryptedPrivateKey = JSON.parse(userKeyPair.privateKey);
    return this.cryptoService.decryptData(encryptedPrivateKey, password);
  }

  /**
   * Get user's public key
   */
  async getUserPublicKey(userId: string): Promise<string> {
    const userKeyPair = await this.userKeyRepository.findOne({
      where: { userId, isActive: true }
    });

    if (!userKeyPair) {
      throw new Error('User public key not found');
    }

    return userKeyPair.publicKey;
  }

  /**
   * Generate message key with forward secrecy
   */
  async generateMessageKey(userId: string, sharedSecret: string): Promise<MessageKeys> {
    const messageKeys = this.cryptoService.generateMessageKey();
    
    // Encrypt message key with shared secret
    const encryptedMessageKey = await this.cryptoService.encryptData(
      messageKeys.messageKey,
      sharedSecret
    );

    const messageKeyRecord: MessageKeyRecord = {
      keyId: messageKeys.keyId,
      userId,
      encryptedMessageKey: JSON.stringify(encryptedMessageKey),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.messageKeyTTL),
      isActive: true
    };

    await this.messageKeyRepository.save(messageKeyRecord);
    return messageKeys;
  }

  /**
   * Get message key
   */
  async getMessageKey(keyId: string, userId: string, sharedSecret: string): Promise<string> {
    const messageKeyRecord = await this.messageKeyRepository.findOne({
      where: { keyId, userId, isActive: true }
    });

    if (!messageKeyRecord) {
      throw new Error('Message key not found');
    }

    if (messageKeyRecord.expiresAt < new Date()) {
      throw new Error('Message key expired');
    }

    const encryptedMessageKey = JSON.parse(messageKeyRecord.encryptedMessageKey);
    return this.cryptoService.decryptData(encryptedMessageKey, sharedSecret);
  }

  /**
   * Rotate user keys
   */
  async rotateUserKeys(userId: string, password: string): Promise<UserKeyPair> {
    // Deactivate old keys
    await this.userKeyRepository.update(
      { userId },
      { isActive: false }
    );

    // Generate new keys
    return this.generateUserKeyPair(userId, password);
  }

  /**
   * Clean up expired message keys
   */
  async cleanupExpiredKeys(): Promise<void> {
    await this.messageKeyRepository.update(
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    );
  }

  /**
   * Check if key rotation is needed
   */
  async isKeyRotationNeeded(userId: string): Promise<boolean> {
    const userKeyPair = await this.userKeyRepository.findOne({
      where: { userId, isActive: true }
    });

    if (!userKeyPair) {
      return true;
    }

    const timeSinceCreation = Date.now() - userKeyPair.createdAt.getTime();
    return timeSinceCreation > this.keyRotationInterval;
  }
}
