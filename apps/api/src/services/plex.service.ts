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
   * Get all media items from a library section with their watched status
   */
  async getLibraryItems(sectionKey: string): Promise<Array<{ ratingKey: string; title: string; viewCount: number; lastViewedAt?: number; file?: string }>> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/library/sections/${sectionKey}/all?X-Plex-Token=${this.token}`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        MediaContainer?: {
          Metadata?: Array<{
            ratingKey: string;
            title: string;
            viewCount?: number;
            lastViewedAt?: number;
            Media?: Array<{
              Part?: Array<{ file?: string }>;
            }>;
          }>;
        };
      };

      const metadata = data.MediaContainer?.Metadata ?? [];
      return metadata.map((item) => ({
        ratingKey: item.ratingKey,
        title: item.title,
        viewCount: item.viewCount ?? 0,
        lastViewedAt: item.lastViewedAt,
        file: item.Media?.[0]?.Part?.[0]?.file,
      }));
    } catch (error) {
      logger.error({ error, sectionKey }, 'Failed to get Plex library items');
      return [];
    }
  }

  /**
   * Get all watched media files from Plex
   * Returns file paths that have been watched (viewCount > 0)
   */
  async getWatchedFiles(): Promise<Array<{ file: string; title: string; lastViewedAt?: number }>> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const libraries = await this.getLibraries();
      const mediaLibraries = libraries.filter(
        (lib) => lib.type === 'movie' || lib.type === 'show'
      );

      const watchedFiles: Array<{ file: string; title: string; lastViewedAt?: number }> = [];

      for (const lib of mediaLibraries) {
        const items = await this.getLibraryItems(lib.key);
        for (const item of items) {
          if (item.viewCount > 0 && item.file) {
            watchedFiles.push({
              file: item.file,
              title: item.title,
              lastViewedAt: item.lastViewedAt,
            });
          }
        }
      }

      return watchedFiles;
    } catch (error) {
      logger.error({ error }, 'Failed to get watched files from Plex');
      return [];
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

