import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  async sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
      });
      return true;
    } catch (error) {
      this.logger.error('FCM send error', error);
      return false;
    }
  }
}
