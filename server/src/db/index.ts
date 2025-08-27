import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const databasePath = process.env.DATABASE_URL?.replace('sqlite:', '') || './database.db';

const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });

export * from './schema.js';

