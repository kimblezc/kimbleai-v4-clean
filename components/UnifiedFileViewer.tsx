'use client';

import { useState, useEffect } from 'react';
import { UnifiedFileSystem, FileRegistryEntry, FileWithContent } from '@/lib/unified-file-system';

interface UnifiedFileViewerProps {
  fileId?: string;
  source?: 'upload' | 'drive' | 'email_attachment' | 'calendar_attachment' | 'link';
  sourceId?: string;
  showMetadata?: boolean;
  showRelated?: boolean;
  allowEdit?: boolean;
  onClose?: () => void;
}

export function UnifiedFileViewer({
  fileId,
  source,
  sourceId,
  showMetadata = true,
  showRelated = false,
  allowEdit = false,
  onClose
}: UnifiedFileViewerProps) {
  const [file, setFile] = useState<FileWithContent | null>(null);
  const [relatedFiles, setRelatedFiles] = useState<FileRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata' | 'related'>('preview');

  useEffect(() => {
    loadFile();
  }, [fileId, source, sourceId]);

  const loadFile = async () => {
    setLoading(true);
    setError(null);

    try {
      if (fileId) {
        // Load by file ID
        const fileData = await fetch(`/api/files/${fileId}`).then(r => r.json());
        if (fileData.success) {
          setFile(fileData.file);

          if (showRelated) {
            const related = await fetch(`/api/files/${fileId}/related`).then(r => r.json());
            if (related.success) {
              setRelatedFiles(related.files);
            }
          }
        } else {
          setError(fileData.error || 'Failed to load file');
        }
      } else if (source && sourceId) {
        // Load by source
        const fileData = await fetch(`/api/files/by-source?source=${source}&sourceId=${sourceId}`).then(r => r.json());
        if (fileData.success && fileData.files.length > 0) {
          setFile(fileData.files[0]);
        } else {
          setError('File not found');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    const mimeType = file.mime_type.toLowerCase();
    const fileType = mimeType.split('/')[0];

    // Images
    if (fileType === 'image') {
      return (
        <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4">
          <img
            src={file.storage_path}
            alt={file.filename}
            className="max-w-full max-h-[600px] object-contain rounded"
          />
        </div>
      );
    }

    // PDFs
    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
          <iframe
            src={file.storage_path}
            className="w-full h-full"
            title={file.filename}
          />
        </div>
      );
    }

    // Audio
    if (fileType === 'audio') {
      return (
        <div className="bg-gray-900 rounded-lg p-6">
          <audio controls className="w-full">
            <source src={file.storage_path} type={file.mime_type} />
            Your browser does not support the audio element.
          </audio>
          {file.processing_result?.transcription && (
            <div className="mt-6 bg-gray-800 rounded p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Transcription</h4>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {file.processing_result.transcription}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Video
    if (fileType === 'video') {
      return (
        <div className="w-full bg-gray-900 rounded-lg overflow-hidden">
          <video controls className="w-full max-h-[600px]">
            <source src={file.storage_path} type={file.mime_type} />
            Your browser does not support the video element.
          </video>
        </div>
      );
    }

    // Text files
    if (fileType === 'text' || mimeType === 'application/json') {
      return (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
            {file.processing_result?.content || 'Loading...'}
          </pre>
        </div>
      );
    }

    // Documents (with extracted text)
    if (file.processing_result?.content || file.processing_result?.contentPreview) {
      return (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 whitespace-pre-wrap">
              {file.processing_result.content || file.processing_result.contentPreview}
            </p>
          </div>
        </div>
      );
    }

    // Fallback - download button
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{file.filename}</h3>
        <p className="text-sm text-gray-400 mb-6">
          {(file.file_size / 1024).toFixed(2)} KB • {file.mime_type}
        </p>
        <a
          href={file.storage_path}
          download={file.filename}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Download File
        </a>
      </div>
    );
  };

  const renderMetadata = () => {
    if (!file) return null;

    return (
      <div className="bg-gray-900 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Filename</label>
            <p className="text-sm text-white">{file.filename}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">File Size</label>
            <p className="text-sm text-white">{(file.file_size / 1024).toFixed(2)} KB</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">MIME Type</label>
            <p className="text-sm text-white">{file.mime_type}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Source</label>
            <p className="text-sm text-white capitalize">{file.file_source.replace('_', ' ')}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Created</label>
            <p className="text-sm text-white">{new Date(file.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Processed</label>
            <p className="text-sm text-white">{file.processed ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {file.tags.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {file.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {file.projects.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">Projects</label>
            <div className="flex flex-wrap gap-2">
              {file.projects.map((proj, idx) => (
                <span key={idx} className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded">
                  {proj}
                </span>
              ))}
            </div>
          </div>
        )}

        {file.source_metadata && Object.keys(file.source_metadata).length > 0 && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">Source Metadata</label>
            <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(file.source_metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderRelated = () => {
    if (relatedFiles.length === 0) {
      return (
        <div className="bg-gray-900 rounded-lg p-6 text-center text-gray-400">
          No related files found
        </div>
      );
    }

    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Related Files ({relatedFiles.length})</h3>
        <div className="space-y-2">
          {relatedFiles.map((relFile) => (
            <div
              key={relFile.id}
              className="bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => setFile(relFile as any)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{relFile.filename}</p>
                  <p className="text-xs text-gray-400">
                    {(relFile.file_size / 1024).toFixed(2)} KB • {relFile.mime_type}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                    {relFile.file_source.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No file selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-white truncate">{file.filename}</h2>
          <p className="text-sm text-gray-400">
            {(file.file_size / 1024).toFixed(2)} KB • {file.mime_type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={file.storage_path}
            download={file.filename}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Download
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {(showMetadata || showRelated) && (
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Preview
          </button>
          {showMetadata && (
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'metadata'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Metadata
            </button>
          )}
          {showRelated && (
            <button
              onClick={() => setActiveTab('related')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'related'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Related ({relatedFiles.length})
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div>
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'metadata' && renderMetadata()}
        {activeTab === 'related' && renderRelated()}
      </div>
    </div>
  );
}
