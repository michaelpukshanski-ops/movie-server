import type { ProviderSearchResult } from '@movie-server/shared';

/**
 * Interface for source providers.
 * All providers must implement this interface to ensure
 * only content sources are used.
 */
export interface SourceProvider {
  /** Unique identifier for this provider */
  readonly name: string;
  
  /** Human-readable display name */
  readonly displayName: string;
  
  /** List of allowed domains this provider can fetch from */
  readonly allowedDomains: readonly string[];
  
  /** List of allowed tracker domains for magnets from this provider */
  readonly allowedTrackers: readonly string[];
  
  /**
   * Search for content matching the query.
   * Returns a list of results that can be confirmed for download.
   */
  search(query: string): Promise<ProviderSearchResult[]>;
  
  /**
   * Get the magnet URI for a specific result.
   * The magnet will be validated against the allowlist before use.
   */
  getMagnet(resultId: string): Promise<string>;
  
  /**
   * Optional: Get additional details about a result
   */
  getDetails?(resultId: string): Promise<Record<string, unknown>>;
}

/**
 * Result of magnet validation
 */
export interface MagnetValidationResult {
  valid: boolean;
  magnetUri?: string;
  infoHash?: string;
  trackers: string[];
  invalidTrackers: string[];
  error?: string;
}

