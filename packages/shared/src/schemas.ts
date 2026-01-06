import { z } from 'zod';
import { DOWNLOAD_STATUS } from './types.js';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Download request schemas
export const downloadRequestSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  provider: z.string().min(1).max(50),
});

export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>;

export const downloadConfirmSchema = z.object({
  provider: z.string().min(1).max(50),
  resultId: z.string().min(1).max(100),
});

export type DownloadConfirmInput = z.infer<typeof downloadConfirmSchema>;

// Download status schema
export const downloadStatusSchema = z.enum([
  DOWNLOAD_STATUS.QUEUED,
  DOWNLOAD_STATUS.FETCHING_MAGNET,
  DOWNLOAD_STATUS.ADDING_TO_QBITTORRENT,
  DOWNLOAD_STATUS.DOWNLOADING,
  DOWNLOAD_STATUS.PAUSED,
  DOWNLOAD_STATUS.COMPLETED,
  DOWNLOAD_STATUS.FAILED,
  DOWNLOAD_STATUS.CANCELED,
]);

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Search schema
export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  ...paginationSchema.shape,
});

export type SearchInput = z.infer<typeof searchSchema>;

// Upload schema
export const uploadConfigSchema = z.object({
  maxSizeBytes: z.number().int().positive(),
  allowedMimeTypes: z.array(z.string()),
});

// File ID param schema
export const fileIdParamSchema = z.object({
  fileId: z.string().uuid(),
});

export const downloadIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Provider search result schema
export const providerSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  sizeBytes: z.number().nullable(),
  seeds: z.number().nullable(),
  peers: z.number().nullable(),
  provider: z.string(),
  year: z.number().optional(),
  quality: z.string().optional(),
});

// Magnet URI validation (basic)
export const magnetUriSchema = z.string().refine(
  (val) => val.startsWith('magnet:?'),
  { message: 'Invalid magnet URI format' }
);

