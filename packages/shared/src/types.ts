// Download status states
export const DOWNLOAD_STATUS = {
  QUEUED: 'QUEUED',
  FETCHING_MAGNET: 'FETCHING_MAGNET',
  ADDING_TO_QBITTORRENT: 'ADDING_TO_QBITTORRENT',
  DOWNLOADING: 'DOWNLOADING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
} as const;

export type DownloadStatus = (typeof DOWNLOAD_STATUS)[keyof typeof DOWNLOAD_STATUS];

// Download model
export interface Download {
  id: string;
  name: string;
  status: DownloadStatus;
  progress: number; // 0-100
  eta: number | null; // seconds remaining
  sizeBytes: number | null;
  downloadedBytes: number;
  savePath: string | null;
  createdAt: string;
  updatedAt: string;
  sourceProvider: string;
  sourceId: string;
  errorMessage?: string;
}

// Library file model
export interface LibraryFile {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  downloadId?: string;
}

// Search result from provider
export interface ProviderSearchResult {
  id: string;
  title: string;
  sizeBytes: number | null;
  seeds: number | null;
  peers: number | null;
  provider: string;
  year?: number;
  quality?: string;
}

// User model (without password)
export interface User {
  id: string;
  username: string;
  createdAt: string;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  DOWNLOAD_PROGRESS: 'DOWNLOAD_PROGRESS',
  DOWNLOAD_STATUS_CHANGE: 'DOWNLOAD_STATUS_CHANGE',
  DOWNLOAD_COMPLETED: 'DOWNLOAD_COMPLETED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  ERROR: 'ERROR',
} as const;

export type WsMessageType = (typeof WS_MESSAGE_TYPES)[keyof typeof WS_MESSAGE_TYPES];

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
}

export interface DownloadProgressPayload {
  downloadId: string;
  progress: number;
  downloadedBytes: number;
  eta: number | null;
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface DownloadStatusChangePayload {
  downloadId: string;
  status: DownloadStatus;
  errorMessage?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

