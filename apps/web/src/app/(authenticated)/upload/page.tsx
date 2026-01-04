'use client';

import { useState, useRef, ChangeEvent } from 'react';
import type { LibraryFile } from '@movie-server/shared';
import { uploadFile, getFileDownloadUrl } from '@/lib/api';

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<LibraryFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setUploadedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      // Simulate progress (actual progress would require XHR)
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(90, p + 10));
      }, 200);

      const result = await uploadFile(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setUploadedFile(result);
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
      setUploadedFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload</h1>

      <div className="card">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept="video/*,audio/*,.zip,.rar,.7z,.srt,.vtt"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supported: Video, Audio, Subtitles, Archives (max 10GB)
            </p>
          </label>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{progress}%</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {uploadedFile && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  ✓ Upload complete!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {uploadedFile.name} ({formatBytes(uploadedFile.sizeBytes)})
                </p>
              </div>
              <a
                href={getFileDownloadUrl(uploadedFile.id)}
                className="btn btn-secondary text-sm"
                download
              >
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

