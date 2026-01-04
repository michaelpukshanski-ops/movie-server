import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { LibraryFile, PaginatedResponse } from '@movie-server/shared';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename, extname, resolve, relative } from 'path';
import { lookup } from 'mime-types';

interface LibraryFileRow {
  id: string;
  name: string;
  path: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
  download_id: string | null;
}

function rowToLibraryFile(row: LibraryFileRow): LibraryFile {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    downloadId: row.download_id ?? undefined,
  };
}

export function addLibraryFile(
  filePath: string,
  downloadId?: string
): LibraryFile {
  const id = uuidv4();
  const name = basename(filePath);
  const stats = statSync(filePath);
  const mimeType = lookup(filePath) || 'application/octet-stream';
  
  // Store relative path from download directory
  const relativePath = relative(config.downloadDir, filePath);
  
  const stmt = db.prepare(`
    INSERT INTO library_files (id, name, path, size_bytes, mime_type, download_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, name, relativePath, stats.size, mimeType, downloadId ?? null);
  
  return {
    id,
    name,
    path: relativePath,
    sizeBytes: stats.size,
    mimeType,
    createdAt: new Date().toISOString(),
    downloadId,
  };
}

export function getLibraryFileById(id: string): LibraryFile | undefined {
  const stmt = db.prepare('SELECT * FROM library_files WHERE id = ?');
  const row = stmt.get(id) as LibraryFileRow | undefined;
  return row ? rowToLibraryFile(row) : undefined;
}

export function getLibraryFiles(
  page: number = 1,
  pageSize: number = 20,
  searchQuery?: string
): PaginatedResponse<LibraryFile> {
  const offset = (page - 1) * pageSize;
  
  let whereClause = '';
  const params: (string | number)[] = [];
  
  if (searchQuery) {
    whereClause = 'WHERE name LIKE ?';
    params.push(`%${searchQuery}%`);
  }
  
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM library_files ${whereClause}`);
  const { count } = countStmt.get(...params) as { count: number };
  
  const stmt = db.prepare(`
    SELECT * FROM library_files ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = stmt.all(...params, pageSize, offset) as LibraryFileRow[];
  
  return {
    items: rows.map(rowToLibraryFile),
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export function getAbsoluteFilePath(libraryFile: LibraryFile): string {
  // Resolve the path and ensure it's within the download directory
  const absolutePath = resolve(config.downloadDir, libraryFile.path);
  const normalizedDownloadDir = resolve(config.downloadDir);
  
  // Security check: prevent path traversal
  if (!absolutePath.startsWith(normalizedDownloadDir)) {
    throw new Error('Invalid file path: path traversal detected');
  }
  
  return absolutePath;
}

export function scanDownloadDirectory(): void {
  logger.info('Scanning download directory for new files...');
  
  if (!existsSync(config.downloadDir)) {
    logger.warn('Download directory does not exist:', config.downloadDir);
    return;
  }
  
  const existingPaths = new Set<string>();
  const stmt = db.prepare('SELECT path FROM library_files');
  const rows = stmt.all() as Array<{ path: string }>;
  rows.forEach(row => existingPaths.add(row.path));
  
  function scanDir(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const relativePath = relative(config.downloadDir, fullPath);
        
        if (!existingPaths.has(relativePath)) {
          try {
            addLibraryFile(fullPath);
            logger.info(`Added file to library: ${relativePath}`);
          } catch (error) {
            logger.error(`Failed to add file to library: ${relativePath}`, error);
          }
        }
      }
    }
  }
  
  scanDir(config.downloadDir);
  logger.info('Download directory scan complete');
}

