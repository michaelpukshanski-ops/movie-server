import 'dotenv/config';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { existsSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../logger.js';
import * as readline from 'readline';

const SALT_ROUNDS = 12;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // Check for --reset flag
    const shouldReset = process.argv.includes('--reset');

    if (shouldReset) {
      logger.info('Resetting database...');

      // Delete existing database files
      const dbFiles = [
        config.dbPath,
        `${config.dbPath}-wal`,
        `${config.dbPath}-shm`,
      ];

      for (const file of dbFiles) {
        if (existsSync(file)) {
          unlinkSync(file);
          logger.info(`Deleted: ${file}`);
        }
      }
    }

    // Ensure data directory exists
    const dbDir = dirname(config.dbPath);
    mkdirSync(dbDir, { recursive: true });

    // Create fresh database connection
    logger.info('Initializing database...');
    const db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Load and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    logger.info('Database schema created');

    // Create admin user
    const password = await prompt('Enter password for admin user: ');
    if (password.length < 8) {
      logger.error('Password must be at least 8 characters');
      process.exit(1);
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const stmt = db.prepare(
      'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)'
    );
    stmt.run(id, 'admin', passwordHash);
    logger.info('Admin user created successfully');

    db.close();
    logger.info('Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();

