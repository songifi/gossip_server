import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { dataSourceOptions } from '../config/database.config';

config();

export default new DataSource(dataSourceOptions);
