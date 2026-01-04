import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { addLibraryFile } from '../services/library.service.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/upload', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ success: false, error: 'No file uploaded' });
      }

      // Check file size (this is approximate, actual check happens during streaming)
      const contentLength = request.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > config.maxUploadSizeBytes) {
        return reply.status(413).send({ 
          success: false, 
          error: `File too large. Maximum size is ${Math.round(config.maxUploadSizeBytes / 1024 / 1024 / 1024)}GB` 
        });
      }

      // Check mime type
      const mimeType = data.mimetype;
      if (!config.allowedUploadMimeTypes.includes(mimeType)) {
        return reply.status(400).send({ 
          success: false, 
          error: `File type not allowed: ${mimeType}` 
        });
      }

      // Ensure upload directory exists
      mkdirSync(config.downloadDir, { recursive: true });

      // Generate safe filename
      const ext = data.filename.split('.').pop() || '';
      const safeFilename = `${uuidv4()}.${ext}`;
      const filePath = join(config.downloadDir, safeFilename);

      // Stream file to disk
      const writeStream = createWriteStream(filePath);
      let bytesWritten = 0;

      data.file.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > config.maxUploadSizeBytes) {
          data.file.destroy(new Error('File too large'));
        }
      });

      await pipeline(data.file, writeStream);

      // Add to library
      const libraryFile = addLibraryFile(filePath);

      // Update the name to original filename
      const { db } = await import('../db/index.js');
      const stmt = db.prepare('UPDATE library_files SET name = ? WHERE id = ?');
      stmt.run(data.filename, libraryFile.id);

      logAudit(request.user!.id, 'FILE_UPLOAD', { 
        fileId: libraryFile.id, 
        fileName: data.filename,
        sizeBytes: bytesWritten 
      }, request.ip);

      logger.info({ fileId: libraryFile.id, fileName: data.filename }, 'File uploaded');

      return reply.send({ 
        success: true, 
        data: { 
          file: {
            ...libraryFile,
            name: data.filename,
          }
        } 
      });
    } catch (error) {
      logger.error({ error }, 'Upload failed');
      
      if ((error as Error).message === 'File too large') {
        return reply.status(413).send({ success: false, error: 'File too large' });
      }
      
      return reply.status(500).send({ success: false, error: 'Upload failed' });
    }
  });
}

