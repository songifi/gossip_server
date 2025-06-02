import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { FcmService } from './fcm.service';
import { EmailService } from './email.service';
import { NotificationPreferences } from './notification-preferences.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationPreferences])],
  providers: [NotificationService, FcmService, EmailService, NotificationPreferencesService, NotificationGateway],
  exports: [NotificationService, FcmService, EmailService, NotificationPreferencesService, NotificationGateway],
})
export class NotificationModule {}
