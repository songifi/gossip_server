import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.NODE_ENV === 'test' 
    ? process.env.TEST_DB_DATABASE || 'nestjs_app_test'
    : process.env.DB_DATABASE || 'nestjs_app',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  subscribers: [__dirname + '/../subscribers/*{.ts,.js}'],
  synchronize: false, // Always false in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: process.env.NODE_ENV !== 'development',
  migrationsTableName: 'migrations',
  
  // Connection Pool Configuration
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE, 10) || 15,
    min: 2,
    acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 60000,
    idle: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 10000,
    evict: 1000,
    handleDisconnects: true,
  },
  
  // Connection timeout
  connectTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 60000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 60000,
  
  // SSL Configuration (uncomment for production)
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}));

// DataSource for CLI operations
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'nestjs_app',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  subscribers: [__dirname + '/../subscribers/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(dataSourceOptions);