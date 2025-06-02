import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { DefaultPermissionsSeed } from './default-permissions.seed';
import { DefaultRolesSeed } from './default-roles.seed';

async function runSeeds() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Running database seeds...');
    
    await DefaultPermissionsSeed.run(dataSource);
    await DefaultRolesSeed.run(dataSource);
    
    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Error running seeds:', error);
  } finally {
    await app.close();
  }
}

runSeeds();

