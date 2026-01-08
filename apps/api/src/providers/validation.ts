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

