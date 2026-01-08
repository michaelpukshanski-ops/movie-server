// API endpoints
export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',

  // Downloads
  DOWNLOADS: '/api/downloads',
  DOWNLOAD_REQUEST: '/api/downloads/request',
  DOWNLOAD_CONFIRM: '/api/downloads/confirm',
  DOWNLOAD_BY_ID: (id: string) => `/api/downloads/${id}`,
  DOWNLOAD_PAUSE: (id: string) => `/api/downloads/${id}/pause`,
  DOWNLOAD_RESUME: (id: string) => `/api/downloads/${id}/resume`,
  DOWNLOAD_CANCEL: (id: string) => `/api/downloads/${id}/cancel`,
  DOWNLOAD_FILES: (id: string) => `/api/downloads/${id}/files`,

  // Library
  LIBRARY: '/api/library',
  FILE_DOWNLOAD: (fileId: string) => `/files/${fileId}`,

  // Upload
  UPLOAD: '/api/upload',

  // Health
  HEALTH: '/health',
} as const;

// Default configuration values
export const DEFAULTS = {
  API_PORT: 3001,
  WEB_PORT: 3000,
  QBITTORRENT_PORT: 8080,
  POLL_INTERVAL_MS: 1000,
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024 * 1024, // 10GB
  SESSION_MAX_AGE_SECONDS: 7 * 24 * 60 * 60, // 7 days
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
} as const;

// Allowed file types for upload
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/x-matroska',
  'video/webm',
  'video/avi',
  'video/quicktime',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/flac',
  'audio/wav',
  'audio/ogg',
  'application/x-subrip',
  'text/vtt',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const;

