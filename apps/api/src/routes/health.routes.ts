import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { qbittorrentService } from '../services/qbittorrent.service.js';
import { wsService } from '../services/websocket.service.js';
import { plexService } from '../services/plex.service.js';
import { ntfyService } from '../services/ntfy.service.js';
import { db } from '../db/index.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    let dbHealthy = false;
    try {
      const stmt = db.prepare('SELECT 1');
      stmt.get();
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }

    // Check Plex and ntfy connectivity
    const [plexHealth, ntfyHealth] = await Promise.all([
      plexService.healthCheck(),
      ntfyService.healthCheck(),
    ]);

    const status = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        qbittorrent: {
          enabled: qbittorrentService.isEnabled,
          connected: qbittorrentService.isConnected,
        },
        websocket: {
          clients: wsService.getClientCount(),
        },
        plex: {
          enabled: plexService.isEnabled(),
          connected: plexHealth.connected,
          serverName: plexHealth.serverName,
        },
        ntfy: {
          enabled: ntfyService.isEnabled(),
          connected: ntfyHealth.connected,
        },
      },
    };

    const httpStatus = dbHealthy ? 200 : 503;
    return reply.status(httpStatus).send(status);
  });

  // Simple providers endpoint
  fastify.get('/api/providers', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { getAllProviders } = await import('../providers/index.js');
    const providers = getAllProviders().map(p => ({
      name: p.name,
      displayName: p.displayName,
    }));
    
    return reply.send({ success: true, data: { providers } });
  });
}

