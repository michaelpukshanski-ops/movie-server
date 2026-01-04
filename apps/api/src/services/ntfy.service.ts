import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * ntfy.sh push notification service.
 * Sends notifications when downloads complete or fail.
 */

interface NtfyMessage {
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5; // 1=min, 3=default, 5=max
  tags?: string[];
  click?: string;
  actions?: Array<{
    action: 'view' | 'http' | 'broadcast';
    label: string;
    url?: string;
  }>;
}

class NtfyService {
  private serverUrl: string;
  private topic: string;
  private enabled: boolean;
  private accessToken?: string;

  constructor() {
    this.serverUrl = config.ntfy.serverUrl;
    this.topic = config.ntfy.topic;
    this.enabled = config.ntfy.enabled;
    this.accessToken = config.ntfy.accessToken;
  }

  /**
   * Check if ntfy integration is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && !!this.topic;
  }

  /**
   * Send a push notification
   */
  async send(message: NtfyMessage): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('ntfy integration disabled, skipping notification');
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const body = {
        topic: this.topic,
        title: message.title,
        message: message.message,
        priority: message.priority ?? 3,
        tags: message.tags ?? [],
        click: message.click,
        actions: message.actions,
      };

      logger.info({ topic: this.topic, title: message.title }, 'Sending ntfy notification');

      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`ntfy API error: ${response.status} ${response.statusText}`);
      }

      logger.info({ topic: this.topic }, 'ntfy notification sent successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to send ntfy notification');
      // Don't throw - we don't want to fail operations due to notification failures
    }
  }

  /**
   * Send download completed notification
   */
  async notifyDownloadComplete(name: string, sizeBytes: number): Promise<void> {
    const sizeFormatted = this.formatBytes(sizeBytes);

    await this.send({
      title: '✅ Download Complete',
      message: `${name} (${sizeFormatted}) has finished downloading`,
      priority: 3,
      tags: ['white_check_mark', 'movie_camera'],
    });
  }

  /**
   * Send download failed notification
   */
  async notifyDownloadFailed(name: string, error: string): Promise<void> {
    await this.send({
      title: '❌ Download Failed',
      message: `${name} failed: ${error}`,
      priority: 4,
      tags: ['x', 'warning'],
    });
  }

  /**
   * Send download started notification
   */
  async notifyDownloadStarted(name: string): Promise<void> {
    await this.send({
      title: '⬇️ Download Started',
      message: `Started downloading: ${name}`,
      priority: 2,
      tags: ['arrow_down'],
    });
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check ntfy server connectivity
   */
  async healthCheck(): Promise<{ connected: boolean }> {
    if (!this.isEnabled()) {
      return { connected: false };
    }

    try {
      // ntfy doesn't have a dedicated health endpoint, so we just check if the server responds
      const response = await fetch(`${this.serverUrl}/${this.topic}/json`, {
        method: 'HEAD',
      });
      return { connected: response.ok || response.status === 405 };
    } catch {
      return { connected: false };
    }
  }
}

export const ntfyService = new NtfyService();

