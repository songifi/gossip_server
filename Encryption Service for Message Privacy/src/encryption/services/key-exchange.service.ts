import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { KeyManagementService } from "./key-management.service";
import { SharedSecret } from "../interfaces/encryption.interface";

@Injectable()
export class KeyExchangeService {
  private pendingExchanges = new Map<string, any>();
  private sharedSecrets = new Map<string, SharedSecret>();

  constructor(private keyManagementService: KeyManagementService) {}

  /**
   * Initiates ECDH key exchange
   */
  initiateKeyExchange(userId: string, remotePublicKey: string): string {
    const keyPair = this.keyManagementService.generateKeyPair();
    this.keyManagementService.storeUserKeyPair(userId, keyPair);

    const exchangeId = crypto.randomUUID();

    this.pendingExchanges.set(exchangeId, {
      userId,
      localKeyPair: keyPair,
      remotePublicKey,
      createdAt: new Date(),
    });

    return exchangeId;
  }

  /**
   * Completes ECDH key exchange and generates shared secret
   */
  completeKeyExchange(
    exchangeId: string,
    remotePublicKey: string
  ): SharedSecret {
    const exchange = this.pendingExchanges.get(exchangeId);

    if (!exchange) {
      throw new Error("Key exchange not found or expired");
    }

    const ecdh = crypto.createECDH("secp256k1");
    ecdh.setPrivateKey(exchange.localKeyPair.privateKey, "hex");

    const sharedSecret = ecdh.computeSecret(remotePublicKey, "hex");
    const keyId = crypto.randomUUID();

    const secret: SharedSecret = {
      secret: sharedSecret,
      keyId,
    };

    this.sharedSecrets.set(keyId, secret);
    this.pendingExchanges.delete(exchangeId);

    return secret;
  }

  /**
   * Gets shared secret by key ID
   */
  getSharedSecret(keyId: string): SharedSecret | undefined {
    return this.sharedSecrets.get(keyId);
  }

  /**
   * Derives encryption key from shared secret
   */
  deriveEncryptionKey(sharedSecret: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(sharedSecret, salt, 100000, 32, "sha256");
  }
}
