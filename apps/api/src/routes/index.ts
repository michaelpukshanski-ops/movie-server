import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { downloadRoutes } from './download.routes.js';
import { downloadActionsRoutes } from './download-actions.routes.js';
import { libraryRoutes } from './library.routes.js';
import { uploadRoutes } from './upload.routes.js';
import { healthRoutes } from './health.routes.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(authRoutes);
  await fastify.register(downloadRoutes);
  await fastify.register(downloadActionsRoutes);
  await fastify.register(libraryRoutes);
  await fastify.register(uploadRoutes);
  await fastify.register(healthRoutes);
}

