import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { downloadRequestSchema, downloadConfirmSchema, downloadIdParamSchema, paginationSchema } from '@movie-server/shared';
import { requireAuth } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { getProvider } from '../providers/index.js';
import {
  createDownload,
  getDownloads,
  getDownloadById,
  getDownloadByIdForUser,
  updateDownloadStatus,
  setDownloadMagnet,
  setDownloadQbHash,
} from '../services/download.service.js';
import { qbittorrentService } from '../services/qbittorrent.service.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export async function downloadRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all downloads for current user
  fastify.get('/api/downloads', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = paginationSchema.safeParse(request.query);
    const { page, pageSize } = query.success ? query.data : { page: 1, pageSize: 20 };

    const downloads = getDownloads(request.user!.id, page, pageSize);

    return reply.send({ success: true, data: downloads });
  });

  // Search provider for content
  fastify.post('/api/downloads/request', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = downloadRequestSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request',
        details: parseResult.error.issues,
      });
    }

    const { query, provider: providerName } = parseResult.data;
    const provider = getProvider(providerName);

    if (!provider) {
      return reply.status(400).send({
        success: false,
        error: `Unknown provider: ${providerName}`,
      });
    }

    logAudit(request.user!.id, 'DOWNLOAD_REQUEST', { query, provider: providerName }, request.ip);

    try {
      const results = await provider.search(query);
      return reply.send({ success: true, data: { results } });
    } catch (error) {
      logger.error({ error, provider: providerName, query }, 'Provider search failed');
      return reply.status(500).send({
        success: false,
        error: 'Search failed',
      });
    }
  });

  // Confirm download
  fastify.post('/api/downloads/confirm', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = downloadConfirmSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request',
      });
    }

    const { provider: providerName, resultId } = parseResult.data;
    const provider = getProvider(providerName);

    if (!provider) {
      return reply.status(400).send({
        success: false,
        error: `Unknown provider: ${providerName}`,
      });
    }

    try {
      // Get magnet/torrent URL from provider
      const magnetOrTorrent = await provider.getMagnet(resultId);

      // Check if this is a torrent URL (prefixed with "torrent:")
      const isTorrentUrl = magnetOrTorrent.startsWith('torrent:');
      const downloadUrl = isTorrentUrl ? magnetOrTorrent.slice(8) : magnetOrTorrent;

      // Get details for the name
      let name = resultId;
      if (provider.getDetails) {
        const details = await provider.getDetails(resultId);
        name = (details['title'] as string) || resultId;
      }

      // Create download record
      const download = createDownload(request.user!.id, name, providerName, resultId, downloadUrl);
      setDownloadMagnet(download.id, downloadUrl);
      updateDownloadStatus(download.id, 'FETCHING_MAGNET');

      logAudit(request.user!.id, 'DOWNLOAD_CONFIRM', {
        downloadId: download.id,
        provider: providerName,
        resultId
      }, request.ip);

      // Add to qBittorrent if enabled
      if (qbittorrentService.isEnabled) {
        updateDownloadStatus(download.id, 'ADDING_TO_QBITTORRENT');

        // qBittorrent's /torrents/add endpoint accepts both magnet links and torrent URLs
        const hash = await qbittorrentService.addMagnet(downloadUrl, config.downloadDir);

        if (hash) {
          setDownloadQbHash(download.id, hash);
          updateDownloadStatus(download.id, 'DOWNLOADING');
        } else {
          updateDownloadStatus(download.id, 'FAILED', 'Failed to add to qBittorrent');
        }
      } else {
        updateDownloadStatus(download.id, 'QUEUED');
      }

      const updatedDownload = getDownloadById(download.id);
      return reply.send({ success: true, data: { download: updatedDownload } });
    } catch (error) {
      logger.error({ error, provider: providerName, resultId }, 'Download confirm failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to start download',
      });
    }
  });

  // Get single download (only if owned by current user)
  fastify.get('/api/downloads/:id', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = downloadIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: 'Invalid download ID' });
    }

    const download = getDownloadByIdForUser(params.data.id, request.user!.id);
    if (!download) {
      return reply.status(404).send({ success: false, error: 'Download not found' });
    }

    return reply.send({ success: true, data: { download } });
  });
}

