import { config } from '../config.js';
import { logger } from '../logger.js';
import { qbittorrentService } from './qbittorrent.service.js';
import { wsService } from './websocket.service.js';
import {
  getActiveDownloads,
  getDownloadByQbHash,
  updateDownloadProgress,
  updateDownloadStatus,
  setDownloadSavePath,
} from './download.service.js';
import { addLibraryFile } from './library.service.js';
import { join } from 'path';
import { existsSync } from 'fs';

let pollingInterval: NodeJS.Timeout | null = null;

function mapQbState(state: string): 'DOWNLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | null {
  switch (state) {
    case 'downloading':
    case 'stalledDL':
    case 'metaDL':
    case 'forcedDL':
    case 'allocating':
    case 'checkingDL':
      return 'DOWNLOADING';
    case 'pausedDL':
    case 'queuedDL':
      return 'PAUSED';
    case 'uploading':
    case 'stalledUP':
    case 'forcedUP':
    case 'pausedUP':
    case 'queuedUP':
    case 'checkingUP':
      return 'COMPLETED';
    case 'error':
    case 'missingFiles':
      return 'FAILED';
    default:
      return null;
  }
}

async function pollQBittorrent(): Promise<void> {
  if (!qbittorrentService.isEnabled || !qbittorrentService.isConnected) {
    return;
  }

  try {
    const torrents = await qbittorrentService.getTorrents();
    const activeDownloads = getActiveDownloads();

    for (const download of activeDownloads) {
      // Skip downloads that don't have a qBittorrent hash yet
      if (!download.id) continue;

      // Find matching torrent by checking all torrents
      const dbDownload = getActiveDownloads().find(d => d.id === download.id);
      if (!dbDownload) continue;

      // Get the qBittorrent hash from the database
      const stmt = await import('../db/index.js').then(m => m.db.prepare(
        'SELECT qbittorrent_hash FROM downloads WHERE id = ?'
      ));
      const row = stmt.get(download.id) as { qbittorrent_hash: string | null } | undefined;
      const qbHash = row?.qbittorrent_hash;

      if (!qbHash) continue;

      const torrent = torrents.find(t => t.hash.toLowerCase() === qbHash.toLowerCase());

      if (!torrent) {
        logger.warn({ downloadId: download.id, qbHash }, 'Torrent not found in qBittorrent');
        continue;
      }

      // Update progress
      const progress = Math.round(torrent.progress * 100);
      const eta = torrent.eta > 0 && torrent.eta < 8640000 ? torrent.eta : null;

      updateDownloadProgress(
        download.id,
        progress,
        torrent.downloaded,
        eta,
        torrent.size
      );

      // Send WebSocket update
      wsService.sendDownloadProgress({
        downloadId: download.id,
        progress,
        downloadedBytes: torrent.downloaded,
        eta,
        downloadSpeed: torrent.dlspeed,
        uploadSpeed: torrent.upspeed,
      });

      // Check for status changes
      const newStatus = mapQbState(torrent.state);
      if (newStatus && newStatus !== download.status) {
        updateDownloadStatus(download.id, newStatus);
        wsService.sendDownloadStatusChange({
          downloadId: download.id,
          status: newStatus,
        });

        // Handle completion
        if (newStatus === 'COMPLETED') {
          setDownloadSavePath(download.id, torrent.save_path);
          wsService.sendDownloadCompleted(download.id);

          // Add files to library
          const files = await qbittorrentService.getTorrentFiles(qbHash);
          for (const file of files) {
            const filePath = join(torrent.save_path, file.name);
            if (existsSync(filePath)) {
              try {
                addLibraryFile(filePath, download.id);
              } catch (error) {
                logger.error({ filePath, error }, 'Failed to add file to library');
              }
            }
          }
        }

        // Handle failure
        if (newStatus === 'FAILED') {
          wsService.sendDownloadFailed(download.id, 'Download failed in qBittorrent');
        }
      }
    }
  } catch (error) {
    logger.error('Polling error:', error);
  }
}

export function startPolling(): void {
  if (pollingInterval) {
    return;
  }

  logger.info({ intervalMs: config.pollIntervalMs }, 'Starting qBittorrent polling');
  pollingInterval = setInterval(pollQBittorrent, config.pollIntervalMs);
}

export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('Stopped qBittorrent polling');
  }
}

