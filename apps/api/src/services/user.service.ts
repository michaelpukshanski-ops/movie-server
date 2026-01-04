import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import type { User } from '@movie-server/shared';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

const SALT_ROUNDS = 12;

export async function createUser(username: string, password: string): Promise<User> {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password_hash)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(id, username, passwordHash);
  
  return {
    id,
    username,
    createdAt: new Date().toISOString(),
  };
}

export function getUserByUsername(username: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as UserRow | undefined;
}

export function getUserById(id: string): User | undefined {
  const stmt = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?');
  const row = stmt.get(id) as { id: string; username: string; created_at: string } | undefined;
  
  if (!row) return undefined;
  
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
  };
}

export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const user = getUserByUsername(username);
  if (!user) return null;
  
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  
  return {
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
  };
}

