import { config } from '../config.js';
import { logger } from '../logger.js';

interface QBTorrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string;
  save_path: string;
  downloaded: number;
  uploaded: number;
}

interface QBTorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
}

class QBittorrentService {
  private baseUrl: string;
  private cookie: string | null = null;
  private connected = false;

  constructor() {
    this.baseUrl = `${config.qbittorrentHost}:${config.qbittorrentPort}`;
  }

  get isEnabled(): boolean {
    return config.qbittorrentEnabled;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}/api/v2${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  async login(): Promise<boolean> {
    if (!this.isEnabled) {
      logger.info('qBittorrent is disabled');
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', config.qbittorrentUsername);
      formData.append('password', config.qbittorrentPassword);

      const response = await this.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (response.ok) {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.cookie = setCookie.split(';')[0] ?? null;
        }
        this.connected = true;
        logger.info('Connected to qBittorrent');
        return true;
      }

      logger.error('Failed to login to qBittorrent:', await response.text());
      return false;
    } catch (error) {
      logger.error('Failed to connect to qBittorrent:', error);
      this.connected = false;
      return false;
    }
  }

  async addMagnet(magnetOrUrl: string, savePath?: string): Promise<string | null> {
    if (!this.connected) {
      await this.login();
    }

    try {
      const formData = new URLSearchParams();
      formData.append('urls', magnetOrUrl);
      if (savePath) {
        formData.append('savepath', savePath);
      }

      const response = await this.request('/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (response.ok) {
        // For magnet links, extract hash directly
        if (magnetOrUrl.startsWith('magnet:')) {
          const match = magnetOrUrl.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
          const hash = match?.[1]?.toLowerCase() ?? null;
          logger.info({ hash }, 'Torrent added to qBittorrent from magnet');
          return hash;
        }

        // For torrent URLs, we need to wait a moment and find the new torrent
        // by checking the torrent list
        logger.info({ url: magnetOrUrl }, 'Torrent URL added to qBittorrent, fetching hash...');

        // Wait a bit for qBittorrent to fetch and add the torrent
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get all torrents and find the most recently added one
        const torrents = await this.getTorrents();
        if (torrents.length > 0) {
          // Sort by added_on descending and get the most recent
          const sorted = torrents.sort((a, b) => (b.added_on || 0) - (a.added_on || 0));
          const hash = sorted[0]?.hash?.toLowerCase() ?? null;
          logger.info({ hash }, 'Found hash for added torrent');
          return hash;
        }

        logger.warn('Could not determine hash for added torrent');
        return null;
      }

      logger.error('Failed to add torrent:', await response.text());
      return null;
    } catch (error) {
      logger.error('Failed to add torrent:', error);
      return null;
    }
  }

  async getTorrents(): Promise<QBTorrent[]> {
    if (!this.connected) {
      await this.login();
    }

    try {
      const response = await this.request('/torrents/info');
      if (response.ok) {
        return await response.json() as QBTorrent[];
      }
      return [];
    } catch (error) {
      logger.error('Failed to get torrents:', error);
      return [];
    }
  }

  async getTorrent(hash: string): Promise<QBTorrent | null> {
    const torrents = await this.getTorrents();
    return torrents.find(t => t.hash.toLowerCase() === hash.toLowerCase()) ?? null;
  }

  async getTorrentFiles(hash: string): Promise<QBTorrentFile[]> {
    if (!this.connected) await this.login();
    try {
      const response = await this.request(`/torrents/files?hash=${hash}`);
      if (response.ok) return await response.json() as QBTorrentFile[];
      return [];
    } catch (error) {
      logger.error('Failed to get torrent files:', error);
      return [];
    }
  }

  async pauseTorrent(hash: string): Promise<boolean> {
    if (!this.connected) await this.login();
    try {
      const response = await this.request(`/torrents/pause?hashes=${hash}`, { method: 'POST' });
      return response.ok;
    } catch { return false; }
  }

  async resumeTorrent(hash: string): Promise<boolean> {
    if (!this.connected) await this.login();
    try {
      const response = await this.request(`/torrents/resume?hashes=${hash}`, { method: 'POST' });
      return response.ok;
    } catch { return false; }
  }

  async deleteTorrent(hash: string, deleteFiles = false): Promise<boolean> {
    if (!this.connected) await this.login();
    try {
      const response = await this.request(
        `/torrents/delete?hashes=${hash}&deleteFiles=${deleteFiles}`,
        { method: 'POST' }
      );
      return response.ok;
    } catch { return false; }
  }
}

export const qbittorrentService = new QBittorrentService();
export type { QBTorrent, QBTorrentFile };

