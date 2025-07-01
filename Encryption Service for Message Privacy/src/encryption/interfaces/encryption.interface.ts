export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SharedSecret {
  secret: Buffer;
  keyId: string;
}

export interface MessageKey {
  key: Buffer;
  keyId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface EncryptionStatus {
  isEncrypted: boolean;
  algorithm: string;
  keyId: string;
  encryptedAt: Date;
}
