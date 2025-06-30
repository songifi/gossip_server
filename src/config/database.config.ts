import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const isTest = configService.get('NODE_ENV') === 'test';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'nestuser'),
  password: configService.get('DB_PASSWORD', 'nestpassword'),
  database: isTest
    ? configService.get('DB_TEST_NAME', 'nestdb_test')
    : configService.get('DB_NAME', 'nestdb'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: configService.get('NODE_ENV') === 'development',
  extra: {
    max: 20, // max pool size
    min: 10, // min pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

export default new DataSource(dataSourceOptions);
