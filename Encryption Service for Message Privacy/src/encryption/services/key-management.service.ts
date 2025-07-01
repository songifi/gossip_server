import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { KeyPair, MessageKey } from "../interfaces/encryption.interface";

@Injectable()
export class KeyManagementService {
  private messageKeys = new Map<string, MessageKey>();
  private userKeyPairs = new Map<string, KeyPair>();

  /**
   * Generates ECDH key pair
   */
  generateKeyPair(): KeyPair {
    const ecdh = crypto.createECDH("secp256k1");
    const privateKey = ecdh.generateKeys("hex");
    const publicKey = ecdh.getPublicKey("hex");

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Stores user key pair
   */
  storeUserKeyPair(userId: string, keyPair: KeyPair): void {
    this.userKeyPairs.set(userId, keyPair);
  }

  /**
   * Gets user key pair
   */
  getUserKeyPair(userId: string): KeyPair | undefined {
    return this.userKeyPairs.get(userId);
  }

  /**
   * Generates and stores message key with forward secrecy
   */
  generateMessageKey(conversationId: string): MessageKey {
    const key = crypto.randomBytes(32);
    const keyId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const messageKey: MessageKey = {
      key,
      keyId,
      createdAt: now,
      expiresAt,
    };

    this.messageKeys.set(keyId, messageKey);

    // Schedule key deletion for forward secrecy
    setTimeout(() => {
      this.messageKeys.delete(keyId);
    }, 24 * 60 * 60 * 1000);

    return messageKey;
  }

  /**
   * Gets message key by ID
   */
  getMessageKey(keyId: string): MessageKey | undefined {
    const messageKey = this.messageKeys.get(keyId);

    if (messageKey && new Date() > messageKey.expiresAt) {
      this.messageKeys.delete(keyId);
      return undefined;
    }

    return messageKey;
  }

  /**
   * Rotates message keys for a conversation
   */
  rotateMessageKey(oldKeyId: string, conversationId: string): MessageKey {
    // Delete old key
    this.messageKeys.delete(oldKeyId);

    // Generate new key
    return this.generateMessageKey(conversationId);
  }

  /**
   * Cleans up expired keys
   */
  cleanupExpiredKeys(): void {
    const now = new Date();

    for (const [keyId, messageKey] of this.messageKeys.entries()) {
      if (now > messageKey.expiresAt) {
        this.messageKeys.delete(keyId);
      }
    }
  }
}
