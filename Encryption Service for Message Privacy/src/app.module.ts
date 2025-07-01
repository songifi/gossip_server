import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { EncryptionModule } from "./encryption/encryption.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EncryptionModule,
    // ... other modules
  ],
})
export class AppModule {}
