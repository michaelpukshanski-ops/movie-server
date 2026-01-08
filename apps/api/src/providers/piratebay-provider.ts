import type { ProviderSearchResult } from '@movie-server/shared';
import type { SourceProvider } from './types.js';
import { logger } from '../logger.js';
import { piratebay } from 'piratebay-scraper';

/**
 * Parse size string like "1.07 GiB" to bytes
 */
function parseSizeToBytes(sizeStr: string): number | null {
  if (!sizeStr) return null;
  
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|KiB|MB|MiB|GB|GiB|TB|TiB)$/i);
  if (!match) return null;
  
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1000,
    'KIB': 1024,
    'MB': 1000 * 1000,
    'MIB': 1024 * 1024,
    'GB': 1000 * 1000 * 1000,
    'GIB': 1024 * 1024 * 1024,
    'TB': 1000 * 1000 * 1000 * 1000,
    'TIB': 1024 * 1024 * 1024 * 1024,
  };
  
  return Math.round(value * (multipliers[unit] || 1));
}

// Store search results temporarily to retrieve magnet links
const resultCache = new Map<string, string>();

/**
 * PirateBayProvider - A source provider using piratebay-scraper.
 */
export class PirateBayProvider implements SourceProvider {
  readonly name = 'piratebay';
  readonly displayName = 'The Pirate Bay';

  async search(query: string): Promise<ProviderSearchResult[]> {
    logger.info({ provider: this.name, query }, 'Searching PirateBay');

    const searchQuery = query.trim();
    if (!searchQuery) {
      return [];
    }

    try {
      const results = await piratebay.search(searchQuery);

      const providerResults: ProviderSearchResult[] = results.map((item, index) => {
        // Create a unique ID for this result
        const resultId = `pb-${Date.now()}-${index}`;
        
        // Cache the magnet link
        if (item.link) {
          resultCache.set(resultId, item.link);
        }

        return {
          id: resultId,
          title: item.title || 'Unknown',
          sizeBytes: parseSizeToBytes(item.size || ''),
          seeds: item.seeders ?? null,
          peers: item.leechers ?? null,
          provider: this.name,
        };
      });

      logger.info({ provider: this.name, resultCount: providerResults.length }, 'Search completed');
      return providerResults;
    } catch (error) {
      logger.error({ error, query }, 'PirateBay search failed');
      throw error;
    }
  }

  async getMagnet(resultId: string): Promise<string> {
    logger.info({ provider: this.name, resultId }, 'Getting magnet for result');

    const magnet = resultCache.get(resultId);
    if (!magnet) {
      throw new Error(`Magnet not found for result: ${resultId}`);
    }

    // Clean up cache entry after use
    resultCache.delete(resultId);

    return magnet;
  }
}

