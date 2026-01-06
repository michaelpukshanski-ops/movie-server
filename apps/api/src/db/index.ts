import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dbDir = dirname(config.dbPath);
mkdirSync(dbDir, { recursive: true });

export const db: DatabaseType = new Database(config.dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  logger.info('Initializing database...');
  
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  db.exec(schema);
  
  logger.info('Database initialized successfully');
}

export function closeDatabase(): void {
  db.close();
  logger.info('Database connection closed');
}

