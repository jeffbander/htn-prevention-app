import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import fs from 'fs';
import path from 'path';

// Test database setup
const testDbPath = path.join(__dirname, '../test.db');

// Clean up test database before each test suite
beforeAll(async () => {
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Create new test database
  const sqlite = new Database(testDbPath);
  const db = drizzle(sqlite, { schema });
  
  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      union TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blood_pressure_readings (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      heart_rate INTEGER,
      htn_status TEXT NOT NULL,
      reading_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      communication_type TEXT NOT NULL,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      call_status TEXT NOT NULL,
      caller_name TEXT NOT NULL,
      encounter_date TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      session_number INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS medical_history (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      condition_name TEXT NOT NULL,
      diagnosis_date TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
  `);
  
  sqlite.close();
});

// Clean up after all tests
afterAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `sqlite:${testDbPath}`;
process.env.PORT = '3002';

