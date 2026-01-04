import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from '@movie-server/shared';
import { verifyPassword, getUserById } from '../services/user.service.js';
import { createSession, deleteSession, getSession } from '../services/session.service.js';
import { logAudit } from '../services/audit.service.js';
import { config } from '../config.js';
import { DEFAULTS } from '@movie-server/shared';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Login
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid credentials format',
      });
    }

    const { username, password } = parseResult.data;
    const user = await verifyPassword(username, password);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const sessionId = createSession(user.id);
    
    logAudit(user.id, 'LOGIN', { username }, request.ip);

    reply.setCookie('session', sessionId, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'strict',
      path: '/',
      maxAge: DEFAULTS.SESSION_MAX_AGE_SECONDS,
    });

    return reply.send({
      success: true,
      data: { user },
    });
  });

  // Logout
  fastify.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies['session'];
    
    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        logAudit(session.user_id, 'LOGOUT', {}, request.ip);
        deleteSession(sessionId);
      }
    }

    reply.clearCookie('session', { path: '/' });
    
    return reply.send({ success: true });
  });

  // Get current user
  fastify.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies['session'];
    
    if (!sessionId) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const session = getSession(sessionId);
    if (!session) {
      reply.clearCookie('session', { path: '/' });
      return reply.status(401).send({
        success: false,
        error: 'Session expired',
      });
    }

    const user = getUserById(session.user_id);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: { user },
    });
  });
}

