import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { DEFAULTS } from '@movie-server/shared';

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export function createSession(userId: string): string {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + DEFAULTS.SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(id, userId, expiresAt);
  
  return id;
}

export function getSession(sessionId: string): SessionRow | undefined {
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE id = ? AND expires_at > datetime('now')
  `);
  
  return stmt.get(sessionId) as SessionRow | undefined;
}

export function deleteSession(sessionId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

export function deleteUserSessions(userId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  stmt.run(userId);
}

export function cleanExpiredSessions(): number {
  const stmt = db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`);
  const result = stmt.run();
  return result.changes;
}

