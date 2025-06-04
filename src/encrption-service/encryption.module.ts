import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from './crypto.service';
import { KeyManagementService } from './key-management.service';
import { EncryptionService } from './encryption.service';
import { MessageController } from './message.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Add your entity classes here
      // UserKeyPair,
      // MessageKeyRecord,
      // EncryptedMessage,
      // EncryptedAttachment
    ])
  ],
  controllers: [MessageController],
  providers: [CryptoService, KeyManagementService, EncryptionService],
  exports: [CryptoService, KeyManagementService, EncryptionService]
})
export class EncryptionModule {}

// Usage example in a service
/*
// Example usage in your application
const encryptionService = new EncryptionService(cryptoService, keyManagementService);

// Send encrypted message
const encryptedMessage = await encryptionService.encryptMessage(
  'sender123',
  'recipient456',
  'This is a secret message',
  'senderPassword123'
);

// Decrypt message
const decryptedContent = await encryptionService.decryptMessage(
  encryptedMessage,
  'recipient456',
  'recipientPassword123'
);

// Check encryption status
const status = encryptionService.getEncryptionStatus(encryptedMessage);
console.log('Encryption Status:', status);
*/
Improve
Explain
