import type { ProviderSearchResult } from '@movie-server/shared';

/**
 * Interface for source providers.
 */
export interface SourceProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** Human-readable display name */
  readonly displayName: string;

  /**
   * Search for content matching the query.
   * Returns a list of results that can be confirmed for download.
   */
  search(query: string): Promise<ProviderSearchResult[]>;

  /**
   * Get the magnet URI or torrent URL for a specific result.
   */
  getMagnet(resultId: string): Promise<string>;

  /**
   * Optional: Get additional details about a result
   */
  getDetails?(resultId: string): Promise<Record<string, unknown>>;
}

