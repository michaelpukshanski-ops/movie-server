import type { ProviderSearchResult } from '@movie-server/shared';
import type { SourceProvider } from './types.js';
import { logger } from '../logger.js';

/**
 * Validates that a string is a valid HTTP/HTTPS URL.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetches HTML content from a URL.
 */
async function fetchPage(url: string): Promise<string> {
  logger.debug({ url }, 'Fetching page');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extracts magnet link from HTML.
 * Finds the first magnet link in the HTML using regex.
 */
function extractMagnetFromPage(html: string): string | null {
  // Match magnet links - they start with "magnet:?" and continue until whitespace or quote
  const magnetRegex = /magnet:\?[^"'\s<>]+/i;
  const match = html.match(magnetRegex);

  if (match) {
    logger.debug({ magnet: match[0].substring(0, 50) + '...' }, 'Found magnet link');
    return match[0];
  }

  logger.warn('No magnet link found in page');
  return null;
}

/**
 * Extracts title from magnet's dn (display name) parameter.
 */
function extractTitleFromMagnet(magnet: string, fallback: string): string {
  const dnMatch = magnet.match(/dn=([^&]+)/);
  if (dnMatch) {
    return decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
  }
  return fallback;
}

/**
 * MovieProvider - A source provider for movies.
 *
 * User provides a URL, we fetch it and extract the first magnet link.
 * The query IS the URL to scrape.
 */
export class MovieProvider implements SourceProvider {
  readonly name = 'movie';
  readonly displayName = 'Movies';

  // Allow any domain since user provides the URL
  readonly allowedDomains = [] as const;

  // Allow any trackers in magnets (no filtering)
  readonly allowedTrackers = [] as const;

  async search(query: string): Promise<ProviderSearchResult[]> {
    logger.info({ provider: this.name, query }, 'Fetching URL for magnet');

    const url = query.trim();

    // The query should be a URL - validate it
    if (!isValidUrl(url)) {
      logger.warn({ query }, 'Query is not a valid URL');
      return [];
    }

    try {
      // Fetch the page
      const html = await fetchPage(url);

      // Extract the first magnet link
      const magnet = extractMagnetFromPage(html);

      if (!magnet) {
        logger.warn({ url }, 'No magnet link found on page');
        return [];
      }

      // Extract title from magnet's dn parameter, fallback to URL
      const title = extractTitleFromMagnet(magnet, url);

      // Encode the magnet in base64 to pass as resultId
      const resultId = Buffer.from(magnet).toString('base64');

      return [{
        id: resultId,
        title,
        sizeBytes: 0,
        seeds: 0,
        peers: 0,
        provider: this.name,
      }];
    } catch (error) {
      logger.error({ error, query }, 'Failed to fetch URL');
      throw error;
    }
  }

  async getMagnet(resultId: string): Promise<string> {
    logger.info({ provider: this.name, resultId: resultId.substring(0, 20) + '...' }, 'Getting magnet for result');

    // The resultId is the magnet URI encoded in base64
    // (we encoded it in parseSearchResults to pass it through the confirm flow)
    try {
      const magnet = Buffer.from(resultId, 'base64').toString('utf-8');

      if (!magnet.startsWith('magnet:?')) {
        throw new Error('Invalid magnet URI in resultId');
      }

      return magnet;
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to get magnet');
      throw error;
    }
  }

  async getDetails(resultId: string): Promise<Record<string, unknown>> {
    // TODO: Implement if the source provides additional details
    return {
      id: resultId,
    };
  }
}
