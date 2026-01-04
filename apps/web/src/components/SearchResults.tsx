'use client';

import type { ProviderSearchResult } from '@movie-server/shared';

interface SearchResultsProps {
  results: ProviderSearchResult[];
  onConfirm: (result: ProviderSearchResult) => void;
  loading?: boolean;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function SearchResults({ results, onConfirm, loading }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No results found. Try a different search term.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div
          key={result.id}
          className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {result.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {result.year && <span>{result.year}</span>}
              {result.quality && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  {result.quality}
                </span>
              )}
              <span>{formatBytes(result.sizeBytes)}</span>
              {result.seeds !== null && (
                <span className="text-green-600 dark:text-green-400">
                  ↑ {result.seeds} seeds
                </span>
              )}
              {result.peers !== null && (
                <span className="text-blue-600 dark:text-blue-400">
                  ↓ {result.peers} peers
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onConfirm(result)}
            disabled={loading}
            className="btn btn-primary whitespace-nowrap"
          >
            {loading ? 'Adding...' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}

