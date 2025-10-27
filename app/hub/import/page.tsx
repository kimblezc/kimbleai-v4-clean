'use client';

/**
 * CROSS-PLATFORM IMPORT PAGE
 *
 * Import conversations and data from:
 * - ChatGPT (JSON export)
 * - Claude Projects (export files)
 * - Notion (pages and databases)
 * - Google Docs
 * - Text/Markdown files
 *
 * Features:
 * - Drag-and-drop upload
 * - Bulk import
 * - Deduplication
 * - Format detection
 * - Embedding generation
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  File,
  Trash2,
  Download,
} from 'lucide-react';

interface ImportFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

interface ImportOptions {
  platform: 'chatgpt' | 'claude' | 'notion' | 'docs' | 'auto';
  generateEmbeddings: boolean;
  uploadToDrive: boolean;
  detectDuplicates: boolean;
  autoMigrate: boolean;
  mergeStrategy: 'skip' | 'merge' | 'replace';
}

export default function ImportPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [files, setFiles] = useState<ImportFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [options, setOptions] = useState<ImportOptions>({
    platform: 'auto',
    generateEmbeddings: true,
    uploadToDrive: true,
    detectDuplicates: true,
    autoMigrate: false,
    mergeStrategy: 'skip',
  });

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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const importFiles: ImportFile[] = newFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...importFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const detectPlatform = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('conversations') && lower.endsWith('.json')) return 'chatgpt';
    if (lower.includes('claude')) return 'claude';
    if (lower.includes('notion')) return 'notion';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docs';
    if (lower.endsWith('.md')) return 'markdown';
    if (lower.endsWith('.txt')) return 'text';
    return 'auto';
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);

    for (const importFile of files) {
      if (importFile.status === 'completed') continue;

      try {
        // Update status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === importFile.id ? { ...f, status: 'uploading', progress: 10 } : f
          )
        );

        const formData = new FormData();
        formData.append('file', importFile.file);
        formData.append('platform', options.platform === 'auto' ? detectPlatform(importFile.file.name) : options.platform);
        formData.append('generateEmbeddings', options.generateEmbeddings.toString());
        formData.append('uploadToDrive', options.uploadToDrive.toString());
        formData.append('detectDuplicates', options.detectDuplicates.toString());
        formData.append('autoMigrate', options.autoMigrate.toString());
        formData.append('mergeStrategy', options.mergeStrategy);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === importFile.id ? { ...f, status: 'processing', progress: 50 } : f
          )
        );

        const response = await fetch('/api/hub/import', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === importFile.id
                ? { ...f, status: 'completed', progress: 100, result: data }
                : f
            )
          );
        } else {
          throw new Error(data.error || 'Import failed');
        }
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === importFile.id
              ? { ...f, status: 'failed', error: error.message }
              : f
          )
        );
      }
    }

    setImporting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">Access the Import Hub with your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/hub')}
            className="text-gray-400 hover:text-white mb-2 text-sm"
          >
            ← Back to Hub
          </button>
          <h1 className="text-3xl font-bold text-white mb-1">Import Data</h1>
          <p className="text-gray-400">Import conversations from ChatGPT, Claude, Notion, and more</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-purple-500 bg-purple-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Drop files here to import
              </h3>
              <p className="text-gray-400 mb-6">
                Supports ChatGPT JSON, Claude exports, Notion pages, Google Docs, Markdown, and text files
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  accept=".json,.md,.txt,.docx,.doc"
                  className="hidden"
                />
                <span className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer inline-block transition-colors">
                  Choose Files
                </span>
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Files ({files.length})
                  </h3>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3">
                  {files.map((importFile) => (
                    <div
                      key={importFile.id}
                      className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg"
                    >
                      {getStatusIcon(importFile.status)}

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {importFile.file.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-400">
                            {(importFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                            {detectPlatform(importFile.file.name)}
                          </span>
                          {importFile.status !== 'pending' && (
                            <span className="text-sm text-gray-400">
                              {importFile.status}
                            </span>
                          )}
                        </div>

                        {importFile.error && (
                          <p className="text-sm text-red-400 mt-1">{importFile.error}</p>
                        )}

                        {importFile.result && (
                          <p className="text-sm text-green-400 mt-1">
                            Imported {importFile.result.stats?.totalConversations || 0} conversations
                          </p>
                        )}
                      </div>

                      {importFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(importFile.id)}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing || files.every((f) => f.status === 'completed')}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import All Files
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Options */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Import Options</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform Detection
                  </label>
                  <select
                    value={options.platform}
                    onChange={(e) => setOptions({ ...options, platform: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="chatgpt">ChatGPT</option>
                    <option value="claude">Claude Projects</option>
                    <option value="notion">Notion</option>
                    <option value="docs">Google Docs</option>
                  </select>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={options.generateEmbeddings}
                    onChange={(e) =>
                      setOptions({ ...options, generateEmbeddings: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Generate Embeddings</span>
                    <p className="text-xs text-gray-400">Enable semantic search (AI-powered)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={options.uploadToDrive}
                    onChange={(e) =>
                      setOptions({ ...options, uploadToDrive: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Upload to Drive</span>
                    <p className="text-xs text-gray-400">Backup to Google Drive</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={options.detectDuplicates}
                    onChange={(e) =>
                      setOptions({ ...options, detectDuplicates: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Detect Duplicates</span>
                    <p className="text-xs text-gray-400">Skip existing conversations</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={options.autoMigrate}
                    onChange={(e) =>
                      setOptions({ ...options, autoMigrate: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Auto-migrate</span>
                    <p className="text-xs text-gray-400">Move to main system automatically</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duplicate Strategy
                  </label>
                  <select
                    value={options.mergeStrategy}
                    onChange={(e) =>
                      setOptions({ ...options, mergeStrategy: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="skip">Skip duplicates</option>
                    <option value="merge">Merge with existing</option>
                    <option value="replace">Replace existing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Supported Formats</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>ChatGPT Export (conversations.json)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Claude Projects Export</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Notion Pages (Markdown)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-yellow-400" />
                  <span>Google Docs (.docx)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Markdown (.md)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Text (.txt)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
