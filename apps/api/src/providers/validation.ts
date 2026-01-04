import { config } from '../config.js';
import { logger } from '../logger.js';
import type { MagnetValidationResult } from './types.js';

/**
 * Parse a magnet URI and extract its components
 */
export function parseMagnetUri(magnetUri: string): {
  infoHash?: string;
  displayName?: string;
  trackers: string[];
} {
  if (!magnetUri.startsWith('magnet:?')) {
    throw new Error('Invalid magnet URI format');
  }

  const params = new URLSearchParams(magnetUri.slice(8));
  const trackers: string[] = [];
  let infoHash: string | undefined;
  let displayName: string | undefined;

  // Extract info hash from xt parameter
  const xt = params.get('xt');
  if (xt) {
    const match = xt.match(/^urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})$/);
    if (match) {
      infoHash = match[1]?.toLowerCase();
    }
  }

  // Extract display name
  displayName = params.get('dn') ?? undefined;

  // Extract all trackers
  params.forEach((value, key) => {
    if (key === 'tr') {
      trackers.push(value);
    }
  });

  return { infoHash, displayName, trackers };
}

/**
 * Extract hostname from a tracker URL
 */
export function extractTrackerHostname(trackerUrl: string): string | null {
  try {
    const url = new URL(trackerUrl);
    return url.hostname.toLowerCase();
  } catch {
    // Handle UDP trackers which may not parse as standard URLs
    const match = trackerUrl.match(/^udp:\/\/([^:/]+)/);
    if (match) {
      return match[1]?.toLowerCase() ?? null;
    }
    return null;
  }
}

/**
 * Validate a magnet URI against the allowlist of tracker domains
 */
export function validateMagnetUri(
  magnetUri: string,
  allowedTrackers: readonly string[] = config.allowedTrackerDomains
): MagnetValidationResult {
  try {
    const parsed = parseMagnetUri(magnetUri);

    if (!parsed.infoHash) {
      return {
        valid: false,
        trackers: [],
        invalidTrackers: [],
        error: 'Magnet URI missing info hash',
      };
    }

    const validTrackers: string[] = [];
    const invalidTrackers: string[] = [];

    for (const tracker of parsed.trackers) {
      const hostname = extractTrackerHostname(tracker);
      if (hostname && allowedTrackers.includes(hostname)) {
        validTrackers.push(tracker);
      } else {
        invalidTrackers.push(tracker);
      }
    }

    // If there are trackers but none are valid, reject
    if (parsed.trackers.length > 0 && validTrackers.length === 0) {
      logger.warn({ magnetUri, invalidTrackers }, 'Magnet rejected: no valid trackers');
      return {
        valid: false,
        infoHash: parsed.infoHash,
        trackers: validTrackers,
        invalidTrackers,
        error: 'No allowed trackers found in magnet URI',
      };
    }

    // Log if some trackers were filtered out
    if (invalidTrackers.length > 0) {
      logger.info(
        { infoHash: parsed.infoHash, invalidTrackers },
        'Some trackers filtered from magnet URI'
      );
    }

    return {
      valid: true,
      magnetUri,
      infoHash: parsed.infoHash,
      trackers: validTrackers,
      invalidTrackers,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      trackers: [],
      invalidTrackers: [],
      error: `Failed to parse magnet URI: ${message}`,
    };
  }
}

/**
 * Validate that a URL is from an allowed domain
 */
export function validateSourceUrl(
  url: string,
  allowedDomains: readonly string[] = config.allowedSourceDomains
): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

