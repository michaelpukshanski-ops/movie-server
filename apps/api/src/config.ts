import { DEFAULTS, ALLOWED_TRACKER_DOMAINS, ALLOWED_SOURCE_DOMAINS, ALLOWED_UPLOAD_MIME_TYPES } from '@movie-server/shared';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function optionalEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable: ${name}`);
  }
  return parsed;
}

function optionalEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config = {
  // Server
  port: optionalEnvNumber('API_PORT', DEFAULTS.API_PORT),
  host: optionalEnv('API_HOST', '0.0.0.0'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  
  // Security
  sessionSecret: requireEnv('SESSION_SECRET'),
  csrfSecret: requireEnv('CSRF_SECRET'),
  cookieSecure: optionalEnvBoolean('COOKIE_SECURE', process.env['NODE_ENV'] === 'production'),
  
  // Database
  dbPath: optionalEnv('DB_PATH', './data/movie-server.db'),
  
  // qBittorrent
  qbittorrentEnabled: optionalEnvBoolean('QBITTORRENT_ENABLED', true),
  qbittorrentHost: optionalEnv('QBITTORRENT_HOST', 'http://localhost'),
  qbittorrentPort: optionalEnvNumber('QBITTORRENT_PORT', DEFAULTS.QBITTORRENT_PORT),
  qbittorrentUsername: optionalEnv('QBITTORRENT_USERNAME', 'admin'),
  qbittorrentPassword: optionalEnv('QBITTORRENT_PASSWORD', 'adminadmin'),
  
  // Downloads
  downloadDir: optionalEnv('DOWNLOAD_DIR', './downloads'),
  pollIntervalMs: optionalEnvNumber('POLL_INTERVAL_MS', DEFAULTS.POLL_INTERVAL_MS),
  
  // Upload
  maxUploadSizeBytes: optionalEnvNumber('MAX_UPLOAD_SIZE_BYTES', DEFAULTS.MAX_UPLOAD_SIZE_BYTES),
  allowedUploadMimeTypes: ALLOWED_UPLOAD_MIME_TYPES as readonly string[],
  
  // Rate limiting
  rateLimitMax: optionalEnvNumber('RATE_LIMIT_MAX', DEFAULTS.RATE_LIMIT_MAX),
  rateLimitWindowMs: optionalEnvNumber('RATE_LIMIT_WINDOW_MS', DEFAULTS.RATE_LIMIT_WINDOW_MS),
  
  // Allowlists
  allowedTrackerDomains: ALLOWED_TRACKER_DOMAINS as readonly string[],
  allowedSourceDomains: ALLOWED_SOURCE_DOMAINS as readonly string[],
  
  // Frontend URL (for CORS)
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
  
  // Logging
  logLevel: optionalEnv('LOG_LEVEL', 'info'),
} as const;

export type Config = typeof config;

