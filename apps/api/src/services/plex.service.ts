import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Plex Media Server integration service.
 * Triggers library scans when new content is added.
 */

interface PlexLibrary {
  key: string;
  title: string;
  type: string;
}

class PlexService {
  private baseUrl: string;
  private token: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = config.plex.host;
    this.token = config.plex.token;
    this.enabled = config.plex.enabled;
  }

  /**
   * Check if Plex integration is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && !!this.token;
  }

  /**
   * Get all library sections from Plex
   */
  async getLibraries(): Promise<PlexLibrary[]> {
    if (!this.isEnabled()) {
      logger.debug('Plex integration disabled, skipping getLibraries');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/library/sections?X-Plex-Token=${this.token}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        MediaContainer?: {
          Directory?: Array<{ key: string; title: string; type: string }>;
        };
      };

      const directories = data.MediaContainer?.Directory ?? [];
      return directories.map((dir) => ({
        key: dir.key,
        title: dir.title,
        type: dir.type,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get Plex libraries');
      throw error;
    }
  }

  /**
   * Trigger a library scan for a specific section
   */
  async scanLibrary(sectionKey: string): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('Plex integration disabled, skipping scanLibrary');
      return;
    }

    try {
      logger.info({ sectionKey }, 'Triggering Plex library scan');

      const response = await fetch(
        `${this.baseUrl}/library/sections/${sectionKey}/refresh?X-Plex-Token=${this.token}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
      }

      logger.info({ sectionKey }, 'Plex library scan triggered successfully');
    } catch (error) {
      logger.error({ error, sectionKey }, 'Failed to trigger Plex library scan');
      throw error;
    }
  }

  /**
   * Scan all libraries (movies and TV shows)
   */
  async scanAllLibraries(): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('Plex integration disabled, skipping scanAllLibraries');
      return;
    }

    try {
      const libraries = await this.getLibraries();
      const mediaLibraries = libraries.filter(
        (lib) => lib.type === 'movie' || lib.type === 'show'
      );

      logger.info({ count: mediaLibraries.length }, 'Scanning Plex media libraries');

      await Promise.all(
        mediaLibraries.map((lib) => this.scanLibrary(lib.key))
      );

      logger.info('All Plex library scans triggered');
    } catch (error) {
      logger.error({ error }, 'Failed to scan all Plex libraries');
      // Don't throw - we don't want to fail the download completion
    }
  }

  /**
   * Check Plex server connectivity
   */
  async healthCheck(): Promise<{ connected: boolean; serverName?: string }> {
    if (!this.isEnabled()) {
      return { connected: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/?X-Plex-Token=${this.token}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return { connected: false };
      }

      const data = await response.json() as {
        MediaContainer?: { friendlyName?: string };
      };

      return {
        connected: true,
        serverName: data.MediaContainer?.friendlyName,
      };
    } catch {
      return { connected: false };
    }
  }
}

export const plexService = new PlexService();

