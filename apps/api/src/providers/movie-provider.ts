import type { ProviderSearchResult } from '@movie-server/shared';
import type { SourceProvider } from './types.js';
import { logger } from '../logger.js';

/**
 * Configuration for the movie source.
 * TODO: User will provide the base URL
 */
const SOURCE_CONFIG = {
  // TODO: Replace with actual source URL provided by user
  baseUrl: 'https://thepiratebay.org/search.php',
  // TODO: Replace with actual search endpoint/path provided by user
  searchPath: '',
};

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
 * Parses search results from HTML.
 * TODO: User will provide the parsing logic for extracting results from the page
 */
function parseSearchResults(_html: string, _query: string): ProviderSearchResult[] {
  // TODO: Implement parsing logic based on user-provided selectors/patterns
  // Example structure:
  // - Find all result elements (e.g., table rows, divs with class)
  // - Extract: id, title, year, quality, sizeBytes, seeds, peers
  // - Return array of ProviderSearchResult

  logger.warn('parseSearchResults not yet implemented - waiting for user-provided logic');
  return [];
}

/**
 * Extracts magnet link from a detail/download page.
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
 * Builds the search URL from a query.
 * TODO: User will provide the URL structure
 */
function buildSearchUrl(query: string): string {
  // TODO: Implement based on user-provided URL pattern
  const encodedQuery = encodeURIComponent(query);
  return `${SOURCE_CONFIG.baseUrl}${SOURCE_CONFIG.searchPath}?q=${encodedQuery}`;
}

/**
 * Builds the detail/download page URL from a result ID.
 * TODO: User will provide the URL structure
 */
function buildDetailUrl(_resultId: string): string {
  // TODO: Implement based on user-provided URL pattern
  return `${SOURCE_CONFIG.baseUrl}/details/${_resultId}`;
}

/**
 * MovieProvider - A source provider for movies.
 *
 * This provider fetches content from a configured source URL,
 * scrapes the search results, and extracts magnet links.
 */
export class MovieProvider implements SourceProvider {
  readonly name = 'movie';
  readonly displayName = 'Movies';

  // TODO: User will provide the allowed domains for this source
  readonly allowedDomains = [
    // TODO: Add source domain here
  ] as const;

  // Only allow these tracker domains in magnets
  readonly allowedTrackers = [
    'tracker.opentrackr.org',
    'tracker.openbittorrent.com',
    'open.stealth.si',
    'bt1.archive.org',
    'bt2.archive.org',
  ] as const;

  async search(query: string): Promise<ProviderSearchResult[]> {
    logger.info({ provider: this.name, query }, 'Searching for movies');

    const normalizedQuery = query.toLowerCase().trim();

    // Check if source is configured
    if (!SOURCE_CONFIG.baseUrl) {
      logger.warn('MovieProvider source URL not configured');
      return [];
    }

    try {
      const searchUrl = buildSearchUrl(normalizedQuery);
      const html = await fetchPage(searchUrl);
      const results = parseSearchResults(html, normalizedQuery);

      return results.map(result => ({
        ...result,
        provider: this.name,
      }));
    } catch (error) {
      logger.error({ error, query }, 'Failed to search movies');
      throw error;
    }
  }

  async getMagnet(resultId: string): Promise<string> {
    logger.info({ provider: this.name, resultId }, 'Getting magnet for result');

    // Check if source is configured
    if (!SOURCE_CONFIG.baseUrl) {
      throw new Error('MovieProvider source URL not configured');
    }

    try {
      const detailUrl = buildDetailUrl(resultId);
      const html = await fetchPage(detailUrl);
      const magnet = extractMagnetFromPage(html);

      if (!magnet) {
        throw new Error(`Could not extract magnet link for: ${resultId}`);
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
