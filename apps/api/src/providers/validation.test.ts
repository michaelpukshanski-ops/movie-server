import { describe, it, expect } from 'vitest';
import { 
  parseMagnetUri, 
  validateMagnetUri, 
  extractTrackerHostname,
  validateSourceUrl 
} from './validation.js';

describe('parseMagnetUri', () => {
  it('should parse a valid magnet URI with info hash', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Test+File';
    const result = parseMagnetUri(magnet);
    
    expect(result.infoHash).toBe('0123456789abcdef0123456789abcdef01234567');
    expect(result.displayName).toBe('Test File');
  });

  it('should extract trackers from magnet URI', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&tr=udp://tracker.opentrackr.org:1337&tr=udp://tracker.openbittorrent.com:6969';
    const result = parseMagnetUri(magnet);
    
    expect(result.trackers).toHaveLength(2);
    expect(result.trackers).toContain('udp://tracker.opentrackr.org:1337');
    expect(result.trackers).toContain('udp://tracker.openbittorrent.com:6969');
  });

  it('should throw for invalid magnet URI', () => {
    expect(() => parseMagnetUri('not-a-magnet')).toThrow('Invalid magnet URI format');
  });
});

describe('extractTrackerHostname', () => {
  it('should extract hostname from HTTP tracker', () => {
    expect(extractTrackerHostname('http://tracker.example.com:8080/announce')).toBe('tracker.example.com');
  });

  it('should extract hostname from UDP tracker', () => {
    expect(extractTrackerHostname('udp://tracker.opentrackr.org:1337/announce')).toBe('tracker.opentrackr.org');
  });

  it('should return null for invalid URL', () => {
    expect(extractTrackerHostname('invalid')).toBe(null);
  });
});

describe('validateMagnetUri', () => {
  const allowedTrackers = ['tracker.opentrackr.org', 'tracker.openbittorrent.com'];

  it('should validate magnet with allowed trackers', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&tr=udp://tracker.opentrackr.org:1337';
    const result = validateMagnetUri(magnet, allowedTrackers);
    
    expect(result.valid).toBe(true);
    expect(result.infoHash).toBe('0123456789abcdef0123456789abcdef01234567');
    expect(result.trackers).toHaveLength(1);
    expect(result.invalidTrackers).toHaveLength(0);
  });

  it('should reject magnet with only disallowed trackers', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&tr=udp://evil-tracker.com:1337';
    const result = validateMagnetUri(magnet, allowedTrackers);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No allowed trackers');
    expect(result.invalidTrackers).toContain('udp://evil-tracker.com:1337');
  });

  it('should filter out disallowed trackers but allow valid ones', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&tr=udp://tracker.opentrackr.org:1337&tr=udp://evil-tracker.com:1337';
    const result = validateMagnetUri(magnet, allowedTrackers);
    
    expect(result.valid).toBe(true);
    expect(result.trackers).toHaveLength(1);
    expect(result.invalidTrackers).toHaveLength(1);
  });

  it('should allow magnet without trackers (DHT only)', () => {
    const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Test';
    const result = validateMagnetUri(magnet, allowedTrackers);
    
    expect(result.valid).toBe(true);
    expect(result.trackers).toHaveLength(0);
  });

  it('should reject magnet without info hash', () => {
    const magnet = 'magnet:?dn=Test&tr=udp://tracker.opentrackr.org:1337';
    const result = validateMagnetUri(magnet, allowedTrackers);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing info hash');
  });
});

describe('validateSourceUrl', () => {
  const allowedDomains = ['archive.org', 'example.com'];

  it('should allow URLs from allowed domains', () => {
    expect(validateSourceUrl('https://archive.org/details/movie', allowedDomains)).toBe(true);
    expect(validateSourceUrl('https://www.archive.org/details/movie', allowedDomains)).toBe(true);
  });

  it('should reject URLs from disallowed domains', () => {
    expect(validateSourceUrl('https://evil-site.com/torrent', allowedDomains)).toBe(false);
  });

  it('should reject invalid URLs', () => {
    expect(validateSourceUrl('not-a-url', allowedDomains)).toBe(false);
  });

  it('should handle subdomains correctly', () => {
    expect(validateSourceUrl('https://sub.archive.org/file', allowedDomains)).toBe(true);
    expect(validateSourceUrl('https://fakearchive.org/file', allowedDomains)).toBe(false);
  });
});

