'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  fileId?: string;
  error?: string;
  result?: any;
  uploadSpeed?: number; // MB/s
  timeRemaining?: number; // seconds
  uploadedBytes?: number;
  startTime?: number;
  abortController?: AbortController;
}

interface FileUploaderProps {
  userId: string;
  projectId?: string;
  onUploadComplete?: (fileIds: string[]) => void;
  maxFiles?: number;
  allowedTypes?: string[];
}

export default function FileUploader({
  userId,
  projectId = 'general',
  onUploadComplete,
  maxFiles = 10,
  allowedTypes = [
    '.m4a', '.mp3', '.wav', '.flac', '.ogg',
    '.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif',
    '.pdf',
    '.docx', '.txt', '.md',
    '.csv', '.xlsx',
    '.eml', '.msg'
  ]
}: FileUploaderProps) {
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format upload speed
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Get file icon
  const getFileIcon = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['m4a', 'mp3', 'wav', 'flac', 'ogg', 'aac'].includes(ext!)) return '🎵';
    if (['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif', 'bmp'].includes(ext!)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['docx', 'txt', 'md', 'rtf'].includes(ext!)) return '📝';
    if (['csv', 'xlsx', 'xls'].includes(ext!)) return '📊';
    if (['eml', 'msg'].includes(ext!)) return '📧';
    return '📎';
  };

  // Poll for upload status
  const pollUploadStatus = async (itemId: string, fileId: string) => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/files/upload?fileId=${fileId}`);
        const data = await response.json();

        setUploadItems(prev => prev.map(item =>
          item.id === itemId
            ? {
                ...item,
                status: data.status,
                progress: data.progress,
                message: data.message,
                result: data.data,
                error: data.error
              }
            : item
        ));

        if (data.status === 'completed') {
          console.log(`Upload completed: ${fileId}`);
          const fileName = uploadItems.find(item => item.id === itemId)?.file.name || 'File';
          toast.success(`${fileName} uploaded successfully`);
          return true;
        } else if (data.status === 'failed') {
          console.error(`Upload failed: ${data.error}`);
          const fileName = uploadItems.find(item => item.id === itemId)?.file.name || 'File';
          toast.error(`${fileName} upload failed`);
          return true;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          // Timeout
          setUploadItems(prev => prev.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'failed',
                  message: 'Processing timeout',
                  error: 'File processing took too long'
                }
              : item
          ));
        }
      } catch (error) {
        console.error('Poll error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  // Upload single file
  const uploadFile = async (item: FileUploadItem) => {
    const uploadToastId = toast.loading(`Uploading ${item.file.name}...`);
    const abortController = new AbortController();
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      // Update with abort controller and start time
      setUploadItems(prev => prev.map(i =>
        i.id === item.id
          ? {
              ...i,
              status: 'uploading',
              progress: 10,
              message: 'Uploading...',
              abortController,
              startTime,
              uploadedBytes: 0
            }
          : i
      ));

      // Simulate progress updates (since we can't track actual XHR progress easily)
      const progressInterval = setInterval(() => {
        setUploadItems(prev => prev.map(i => {
          if (i.id === item.id && i.status === 'uploading' && i.progress < 90) {
            const elapsedSeconds = (Date.now() - (i.startTime || Date.now())) / 1000;
            const estimatedTotalTime = elapsedSeconds / (i.progress / 100);
            const remainingTime = estimatedTotalTime - elapsedSeconds;
            const uploadedBytes = (i.file.size * i.progress) / 100;
            const speed = uploadedBytes / elapsedSeconds;

            return {
              ...i,
              progress: Math.min(i.progress + 5, 90),
              uploadedBytes,
              uploadSpeed: speed,
              timeRemaining: remainingTime > 0 ? remainingTime : 0
            };
          }
          return i;
        }));
      }, 500);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (result.success) {
        toast.loading('Processing file...', { id: uploadToastId });
        setUploadItems(prev => prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                status: 'processing',
                progress: 30,
                message: 'Processing...',
                fileId: result.fileId
              }
            : i
        ));

        // Start polling for status
        pollUploadStatus(item.id, result.fileId);
        toast.dismiss(uploadToastId);
      } else {
        toast.error(`Upload failed: ${result.error}`, { id: uploadToastId });
        setUploadItems(prev => prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                status: 'failed',
                progress: 0,
                message: 'Upload failed',
                error: result.error
              }
            : i
        ));
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload failed', { id: uploadToastId });
      setUploadItems(prev => prev.map(i =>
        i.id === item.id
          ? {
              ...i,
              status: 'failed',
              progress: 0,
              message: 'Upload failed',
              error: error.message
            }
          : i
      ));
    }
  };

  // Handle files
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (uploadItems.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newItems: FileUploadItem[] = fileArray.map(file => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
      progress: 0,
      message: 'Waiting to upload...'
    }));

    setUploadItems(prev => [...prev, ...newItems]);

    // Start uploading
    newItems.forEach(item => {
      setTimeout(() => uploadFile(item), 100);
    });
  }, [uploadItems, maxFiles, uploadFile]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Cancel upload
  const cancelUpload = (id: string) => {
    const item = uploadItems.find(i => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
      setUploadItems(prev => prev.map(i =>
        i.id === id
          ? { ...i, status: 'failed', message: 'Upload cancelled', error: 'Cancelled by user' }
          : i
      ));
      toast.error('Upload cancelled');
    }
  };

  // Remove item
  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  // Clear completed
  const clearCompleted = () => {
    setUploadItems(prev => prev.filter(item => item.status !== 'completed' && item.status !== 'failed'));
  };

  // Calculate overall progress
  const completedCount = uploadItems.filter(item => item.status === 'completed').length;
  const failedCount = uploadItems.filter(item => item.status === 'failed').length;
  const totalCount = uploadItems.length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Upload Files</h3>
        {uploadItems.length > 0 && (
          <button
            onClick={clearCompleted}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept={allowedTypes.join(',')}
          className="hidden"
        />

        <div className="text-6xl mb-3">📁</div>

        <h4 className="text-white font-medium mb-2">
          Drop files here or click to browse
        </h4>

        <p className="text-sm text-gray-400 mb-4">
          Support for audio, images, PDFs, documents, spreadsheets, and emails
        </p>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="primary"
        >
          Select Files
        </Button>

        <div className="mt-4 text-xs text-gray-500">
          <div>Max {maxFiles} files per upload</div>
          <div className="mt-1">
            Audio: 2GB max • Images: 50MB max • Documents: 100MB max
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadItems.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">
              {completedCount} of {totalCount} completed
              {failedCount > 0 && (
                <span className="text-red-500 ml-2">
                  ({failedCount} failed)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">
                    {getFileIcon(item.file.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {item.file.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatFileSize(item.file.size)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'completed' && (
                          <span className="text-green-500 text-xl">✓</span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-red-500 text-xl">✗</span>
                        )}
                        {['pending', 'uploading', 'processing'].includes(item.status) && (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                            {item.status === 'uploading' && (
                              <button
                                onClick={() => cancelUpload(item.id)}
                                className="text-red-400 hover:text-red-300 transition-colors text-xs px-2 py-1 bg-red-900/20 rounded"
                                title="Cancel upload"
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                        {(item.status === 'completed' || item.status === 'failed') && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar with detailed info */}
                    {['uploading', 'processing'].includes(item.status) && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>{item.progress}%</span>
                          {item.status === 'uploading' && (
                            <div className="flex items-center gap-2">
                              {item.uploadSpeed && (
                                <span>{formatSpeed(item.uploadSpeed)}</span>
                              )}
                              {item.timeRemaining && item.timeRemaining > 0 && (
                                <span>{formatTimeRemaining(item.timeRemaining)} left</span>
                              )}
                              {item.uploadedBytes && (
                                <span>{formatFileSize(item.uploadedBytes)} / {formatFileSize(item.file.size)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Status Message */}
                    <div className={`text-xs ${
                      item.status === 'failed' ? 'text-red-400' :
                      item.status === 'completed' ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {item.message}
                      {item.error && (
                        <div className="mt-1 text-red-400">
                          Error: {item.error}
                        </div>
                      )}
                    </div>

                    {/* Processing Result */}
                    {item.status === 'completed' && item.result && (
                      <div className="mt-2 text-xs text-gray-400">
                        {item.result.transcription && (
                          <div>Duration: {Math.round(item.result.duration || 0)}s</div>
                        )}
                        {item.result.analysis && (
                          <div>Analysis: {item.result.analysis.substring(0, 100)}...</div>
                        )}
                        {item.result.pageCount && (
                          <div>Pages: {item.result.pageCount}</div>
                        )}
                        {item.result.wordCount && (
                          <div>Words: {item.result.wordCount}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
