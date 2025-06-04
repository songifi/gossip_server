import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../config/database.config';
import { UserSeed } from './user.seed';

async function runSeeds() {
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    await UserSeed.run(dataSource);
    
    console.log('Seeds completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();