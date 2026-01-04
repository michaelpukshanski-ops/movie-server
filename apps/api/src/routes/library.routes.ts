import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchSchema, fileIdParamSchema } from '@movie-server/shared';
import { requireAuth } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { getLibraryFiles, getLibraryFileById, getAbsoluteFilePath } from '../services/library.service.js';
import { createReadStream, statSync } from 'fs';
import { logger } from '../logger.js';

export async function libraryRoutes(fastify: FastifyInstance): Promise<void> {
  // Get library files
  fastify.get('/api/library', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = searchSchema.safeParse(request.query);
    const { page, pageSize, q } = query.success ? query.data : { page: 1, pageSize: 20, q: undefined };
    
    const files = getLibraryFiles(page, pageSize, q);
    
    return reply.send({ success: true, data: files });
  });

  // Download file
  fastify.get('/files/:fileId', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = fileIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: 'Invalid file ID' });
    }

    const file = getLibraryFileById(params.data.fileId);
    if (!file) {
      return reply.status(404).send({ success: false, error: 'File not found' });
    }

    try {
      const absolutePath = getAbsoluteFilePath(file);
      const stats = statSync(absolutePath);
      
      logAudit(request.user!.id, 'FILE_DOWNLOAD', { fileId: file.id, fileName: file.name }, request.ip);

      // Handle range requests for video streaming
      const range = request.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0] ?? '0', 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunkSize = end - start + 1;

        reply.header('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Length', chunkSize);
        reply.header('Content-Type', file.mimeType);
        reply.status(206);

        const stream = createReadStream(absolutePath, { start, end });
        return reply.send(stream);
      }

      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      reply.header('Content-Type', file.mimeType);
      reply.header('Content-Length', stats.size);
      reply.header('Accept-Ranges', 'bytes');

      const stream = createReadStream(absolutePath);
      return reply.send(stream);
    } catch (error) {
      logger.error({ error, fileId: file.id }, 'Failed to serve file');
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return reply.status(404).send({ success: false, error: 'File not found on disk' });
      }
      
      return reply.status(500).send({ success: false, error: 'Failed to serve file' });
    }
  });
}

