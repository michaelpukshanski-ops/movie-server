import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './index.js';
import { createUser, getUserByUsername } from '../services/user.service.js';
import { logger } from '../logger.js';
import * as readline from 'readline';

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
    // Initialize database schema
    initializeDatabase();

    // Check if admin user exists
    const existingUser = getUserByUsername('admin');
    if (existingUser) {
      logger.info('Admin user already exists');
    } else {
      // Create admin user
      const password = await prompt('Enter password for admin user: ');
      if (password.length < 8) {
        logger.error('Password must be at least 8 characters');
        process.exit(1);
      }
      
      await createUser('admin', password);
      logger.info('Admin user created successfully');
    }

    closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();

