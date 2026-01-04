import type { ProviderSearchResult } from '@movie-server/shared';
import type { SourceProvider } from './types.js';
import { logger } from '../logger.js';

/**
 * Mock movie data representing , public domain content.
 * 
 * TODO: Wire this to a real provider like Internet Archive or
 * Public Domain Torrents. The current implementation uses in-memory
 * mock data for demonstration purposes.
 */
const MOCK_MOVIES: Array<{
  id: string;
  title: string;
  year: number;
  quality: string;
  sizeBytes: number;
  seeds: number;
  peers: number;
  magnetUri: string;
}> = [
  {
    id: 'night-of-living-dead-1968',
    title: 'Night of the Living Dead',
    year: 1968,
    quality: '720p',
    sizeBytes: 1_500_000_000,
    seeds: 150,
    peers: 45,
    magnetUri: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Night+of+the+Living+Dead+1968&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://tracker.openbittorrent.com:6969/announce',
  },
  {
    id: 'nosferatu-1922',
    title: 'Nosferatu',
    year: 1922,
    quality: '1080p',
    sizeBytes: 2_200_000_000,
    seeds: 89,
    peers: 23,
    magnetUri: 'magnet:?xt=urn:btih:abcdef0123456789abcdef0123456789abcdef01&dn=Nosferatu+1922&tr=udp://tracker.opentrackr.org:1337/announce',
  },
  {
    id: 'the-general-1926',
    title: 'The General',
    year: 1926,
    quality: '720p',
    sizeBytes: 1_800_000_000,
    seeds: 67,
    peers: 18,
    magnetUri: 'magnet:?xt=urn:btih:fedcba9876543210fedcba9876543210fedcba98&dn=The+General+1926&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce',
  },
  {
    id: 'metropolis-1927',
    title: 'Metropolis',
    year: 1927,
    quality: '1080p',
    sizeBytes: 3_500_000_000,
    seeds: 234,
    peers: 78,
    magnetUri: 'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=Metropolis+1927&tr=udp://tracker.opentrackr.org:1337/announce',
  },
  {
    id: 'his-girl-friday-1940',
    title: 'His Girl Friday',
    year: 1940,
    quality: '720p',
    sizeBytes: 1_200_000_000,
    seeds: 45,
    peers: 12,
    magnetUri: 'magnet:?xt=urn:btih:9876543210fedcba9876543210fedcba98765432&dn=His+Girl+Friday+1940&tr=udp://tracker.openbittorrent.com:6969/announce',
  },
  {
    id: 'charade-1963',
    title: 'Charade',
    year: 1963,
    quality: '1080p',
    sizeBytes: 2_800_000_000,
    seeds: 112,
    peers: 34,
    magnetUri: 'magnet:?xt=urn:btih:abcd1234efgh5678ijkl9012mnop3456qrst7890&dn=Charade+1963&tr=udp://tracker.opentrackr.org:1337/announce',
  },
];

/**
 * MovieProvider - A source provider for public domain movies.
 * 
 * This provider only returns content that is ly in the public domain.
 * All magnet URIs use only allowlisted trackers.
 */
export class MovieProvider implements SourceProvider {
  readonly name = 'movie';
  readonly displayName = 'Public Domain Movies';
  
  // Only allow fetching from these domains
  readonly allowedDomains = [
    'archive.org',
    'www.archive.org',
    'publicdomaintorrents.info',
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
    
    // TODO: Replace with actual API call to source
    // For now, filter mock data
    const results = MOCK_MOVIES.filter(movie =>
      movie.title.toLowerCase().includes(normalizedQuery) ||
      movie.year.toString().includes(normalizedQuery)
    );

    return results.map(movie => ({
      id: movie.id,
      title: movie.title,
      sizeBytes: movie.sizeBytes,
      seeds: movie.seeds,
      peers: movie.peers,
      provider: this.name,
      year: movie.year,
      quality: movie.quality,
    }));
  }

  async getMagnet(resultId: string): Promise<string> {
    logger.info({ provider: this.name, resultId }, 'Getting magnet for result');
    
    // TODO: Replace with actual API call to source
    const movie = MOCK_MOVIES.find(m => m.id === resultId);
    
    if (!movie) {
      throw new Error(`Movie not found: ${resultId}`);
    }

    return movie.magnetUri;
  }

  async getDetails(resultId: string): Promise<Record<string, unknown>> {
    const movie = MOCK_MOVIES.find(m => m.id === resultId);
    
    if (!movie) {
      throw new Error(`Movie not found: ${resultId}`);
    }

    return {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      quality: movie.quality,
      sizeBytes: movie.sizeBytes,
      seeds: movie.seeds,
      peers: movie.peers,
    };
  }
}

