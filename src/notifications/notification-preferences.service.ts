import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferences } from './notification-preferences.entity';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepository: Repository<NotificationPreferences>,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepository.findOneBy({ userId });
    if (!prefs) {
      prefs = this.preferencesRepository.create({ userId });
      await this.preferencesRepository.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepository.findOneBy({ userId });
    if (!prefs) {
      prefs = this.preferencesRepository.create({ userId, ...updates });
    } else {
      Object.assign(prefs, updates);
    }
    return this.preferencesRepository.save(prefs);
  }
}
