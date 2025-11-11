import dotenv from 'dotenv';

dotenv.config();

const databaseConfig = {
  url: process.env.DATABASE_URL ?? '',
};

export default databaseConfig;
