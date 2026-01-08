import type { ProviderSearchResult } from '@movie-server/shared';
import type { SourceProvider } from './types.js';
import { logger } from '../logger.js';
import * as cheerio from 'cheerio';

/**
 * Internet Archive API response types
 */
interface ArchiveSearchResponse {
  response: {
    numFound: number;
    docs: ArchiveDoc[];
  };
}

interface ArchiveDoc {
  identifier: string;
  title?: string;
  year?: number;
  description?: string | string[];
  mediatype?: string;
  item_size?: number;
}

interface ArchiveMetadataResponse {
  files?: ArchiveFile[];
  metadata?: {
    title?: string;
    year?: string;
    description?: string | string[];
  };
}

interface ArchiveFile {
  name: string;
  format?: string;
  size?: string;
}

/**
 * Fetches a URL and returns a cheerio instance for HTML parsing.
 */
async function fetchAndParse(url: string): Promise<cheerio.CheerioAPI> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MovieServer/1.0',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return cheerio.load(html);
}

/**
 * Searches Internet Archive for movies/video content.
 */
async function searchArchive(query: string): Promise<ArchiveDoc[]> {
  // Search for video content on archive.org
  const searchUrl = new URL('https://archive.org/advancedsearch.php');
  searchUrl.searchParams.set('q', `${query} AND mediatype:(movies)`);
  searchUrl.searchParams.set('fl[]', 'identifier,title,year,description,mediatype,item_size');
  searchUrl.searchParams.set('rows', '20');
  searchUrl.searchParams.set('page', '1');
  searchUrl.searchParams.set('output', 'json');

  logger.debug({ url: searchUrl.toString() }, 'Searching Internet Archive');

  const response = await fetch(searchUrl.toString(), {
    headers: {
      'User-Agent': 'MovieServer/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Archive search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as ArchiveSearchResponse;
  return data.response.docs;
}

/**
 * Gets the torrent download URL for an archive.org item.
 * Archive.org provides torrents for most items at /{identifier}/{identifier}_archive.torrent
 */
function getArchiveTorrentUrl(identifier: string): string {
  return `https://archive.org/download/${identifier}/${identifier}_archive.torrent`;
}

/**
 * Fetches metadata for an archive.org item to get file details.
 */
async function getArchiveMetadata(identifier: string): Promise<ArchiveMetadataResponse> {
  const metadataUrl = `https://archive.org/metadata/${identifier}`;

  const response = await fetch(metadataUrl, {
    headers: {
      'User-Agent': 'MovieServer/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  return response.json() as Promise<ArchiveMetadataResponse>;
}

/**
 * MovieProvider - A source provider for movies from Internet Archive.
 *
 * Searches archive.org for public domain movies and provides torrent downloads.
 */
export class MovieProvider implements SourceProvider {
  readonly name = 'movie';
  readonly displayName = 'Internet Archive Movies';

  async search(query: string): Promise<ProviderSearchResult[]> {
    logger.info({ provider: this.name, query }, 'Searching for movies');

    const searchQuery = query.trim();
    if (!searchQuery) {
      return [];
    }

    try {
      const docs = await searchArchive(searchQuery);

      const results: ProviderSearchResult[] = docs.map((doc) => {
        // Use identifier as the result ID - we'll use it to get the torrent
        const resultId = doc.identifier;

        // Get title, fallback to identifier
        const title = doc.title || doc.identifier;

        // Get year if available
        const year = doc.year;

        // Get size if available (item_size is in bytes)
        const sizeBytes = doc.item_size || null;

        return {
          id: resultId,
          title,
          sizeBytes,
          seeds: null, // Archive.org doesn't provide seed counts
          peers: null,
          provider: this.name,
          year,
        };
      });

      logger.info({ provider: this.name, resultCount: results.length }, 'Search completed');
      return results;
    } catch (error) {
      logger.error({ error, query }, 'Search failed');
      throw error;
    }
  }

  async getMagnet(resultId: string): Promise<string> {
    logger.info({ provider: this.name, resultId }, 'Getting magnet for result');

    // The resultId is the archive.org identifier
    // We need to fetch the torrent file and convert to magnet, or use archive.org's magnet format
    try {
      // Archive.org provides a standard magnet link format for items
      // The info hash can be obtained from the torrent, but archive.org also supports
      // direct torrent downloads. For simplicity, we'll construct a magnet with the torrent URL.

      // First, get metadata to find the torrent file
      const metadata = await getArchiveMetadata(resultId);

      // Find the torrent file in the files list
      const torrentFile = metadata.files?.find(f => f.name.endsWith('_archive.torrent'));

      if (!torrentFile) {
        // Fallback: use the standard torrent URL pattern
        const torrentUrl = getArchiveTorrentUrl(resultId);
        logger.info({ torrentUrl }, 'Using standard torrent URL');

        // Return a "magnet" that's actually the torrent URL
        // The download service will need to handle this
        return `torrent:${torrentUrl}`;
      }

      const torrentUrl = `https://archive.org/download/${resultId}/${torrentFile.name}`;
      logger.info({ torrentUrl }, 'Found torrent file');

      // Return torrent URL prefixed with "torrent:" so download service knows to fetch it
      return `torrent:${torrentUrl}`;
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to get magnet/torrent');
      throw error;
    }
  }

  async getDetails(resultId: string): Promise<Record<string, unknown>> {
    try {
      const metadata = await getArchiveMetadata(resultId);
      return {
        id: resultId,
        title: metadata.metadata?.title,
        year: metadata.metadata?.year,
        description: metadata.metadata?.description,
        archiveUrl: `https://archive.org/details/${resultId}`,
      };
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to get details');
      return { id: resultId };
    }
  }
}
