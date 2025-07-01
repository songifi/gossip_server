import { Module } from "@nestjs/common";
import { EncryptionService } from "./services/encryption.service";
import { KeyManagementService } from "./services/key-management.service";
import { KeyExchangeService } from "./services/key-exchange.service";
import { MessageEncryptionService } from "./services/message-encryption.service";
import { FileEncryptionService } from "./services/file-encryption.service";
import { EncryptionController } from "./controllers/encryption.controller";

@Module({
  providers: [
    EncryptionService,
    KeyManagementService,
    KeyExchangeService,
    MessageEncryptionService,
    FileEncryptionService,
  ],
  controllers: [EncryptionController],
  exports: [
    EncryptionService,
    KeyManagementService,
    KeyExchangeService,
    MessageEncryptionService,
    FileEncryptionService,
  ],
})
export class EncryptionModule {}
