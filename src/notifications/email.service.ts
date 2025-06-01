import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      this.logger.warn('SENDGRID_API_KEY not set. Email sending will fail.');
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.error('SENDGRID_API_KEY not set.');
      return false;
    }
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@gossip_server.com',
      subject,
      text,
      html,
    };
    try {
      await sgMail.send(msg);
      return true;
    } catch (error) {
      this.logger.error('SendGrid send error', error);
      return false;
    }
  }
}
