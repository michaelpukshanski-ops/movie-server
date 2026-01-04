import type { WebSocket } from 'ws';
import type { WsMessage, DownloadProgressPayload, DownloadStatusChangePayload } from '@movie-server/shared';
import { WS_MESSAGE_TYPES } from '@movie-server/shared';
import { logger } from '../logger.js';

class WebSocketService {
  private clients = new Set<WebSocket>();

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    logger.info({ clientCount: this.clients.size }, 'WebSocket client connected');

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info({ clientCount: this.clients.size }, 'WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private broadcast(message: WsMessage): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(data);
        } catch (error) {
          logger.error('Failed to send WebSocket message:', error);
        }
      }
    }
  }

  sendDownloadProgress(payload: DownloadProgressPayload): void {
    this.broadcast({
      type: WS_MESSAGE_TYPES.DOWNLOAD_PROGRESS,
      payload,
    });
  }

  sendDownloadStatusChange(payload: DownloadStatusChangePayload): void {
    this.broadcast({
      type: WS_MESSAGE_TYPES.DOWNLOAD_STATUS_CHANGE,
      payload,
    });
  }

  sendDownloadCompleted(downloadId: string): void {
    this.broadcast({
      type: WS_MESSAGE_TYPES.DOWNLOAD_COMPLETED,
      payload: { downloadId },
    });
  }

  sendDownloadFailed(downloadId: string, errorMessage: string): void {
    this.broadcast({
      type: WS_MESSAGE_TYPES.DOWNLOAD_FAILED,
      payload: { downloadId, errorMessage },
    });
  }

  sendError(error: string): void {
    this.broadcast({
      type: WS_MESSAGE_TYPES.ERROR,
      payload: { error },
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();

