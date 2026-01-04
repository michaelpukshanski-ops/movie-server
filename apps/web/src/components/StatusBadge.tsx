'use client';

import type { DownloadStatus } from '@movie-server/shared';

interface StatusBadgeProps {
  status: DownloadStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<DownloadStatus, { label: string; className: string }> = {
    QUEUED: {
      label: 'Queued',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
    FETCHING_MAGNET: {
      label: 'Fetching',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    ADDING_TO_QBITTORRENT: {
      label: 'Adding',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    DOWNLOADING: {
      label: 'Downloading',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    FAILED: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    CANCELED: {
      label: 'Canceled',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
  };

  const config = statusConfig[status] || statusConfig.QUEUED;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

