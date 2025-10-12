'use client';

import { useState, useEffect } from 'react';
import { FileRegistryEntry, FileWithContent } from '@/lib/unified-file-system';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface AdvancedFileViewerProps {
  fileId?: string;
  file?: FileRegistryEntry;
  showMetadata?: boolean;
  showRelated?: boolean;
  showSearch?: boolean;
  onClose?: () => void;
}

export function AdvancedFileViewer({
  fileId,
  file: initialFile,
  showMetadata = true,
  showRelated = true,
  showSearch = false,
  onClose,
}: AdvancedFileViewerProps) {
  const [file, setFile] = useState<FileWithContent | null>(initialFile as any || null);
  const [relatedFiles, setRelatedFiles] = useState<Array<FileRegistryEntry & { similarity: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata' | 'related' | 'search'>('preview');

  // PDF-specific state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (fileId || initialFile) {
      loadFile();
    }
  }, [fileId, initialFile]);

  const loadFile = async () => {
    setLoading(true);
    setError(null);

    try {
      const targetFileId = fileId || initialFile?.id;
      if (!targetFileId) {
        throw new Error('No file ID provided');
      }

      // Load file data
      const fileData = await fetch(`/api/files/${targetFileId}`).then((r) => r.json());
      if (fileData.success) {
        setFile(fileData.file);

        // Load related files if requested
        if (showRelated) {
          const related = await fetch(`/api/files/${targetFileId}/related`).then((r) =>
            r.json()
          );
          if (related.success) {
            setRelatedFiles(related.files);
          }
        }
      } else {
        setError(fileData.error || 'Failed to load file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !file) return;

    setSearchLoading(true);
    try {
      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          fileId: file.id,
          limit: 10,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    const mimeType = file.mime_type.toLowerCase();
    const fileType = mimeType.split('/')[0];
    const isGoogleDoc = mimeType.includes('google-apps');

    // Google Docs/Sheets/Slides - Embed via preview URL
    if (isGoogleDoc && file.preview_url) {
      return (
        <div className="w-full h-[800px] bg-gray-900 rounded-lg overflow-hidden">
          <iframe
            src={file.preview_url}
            className="w-full h-full border-0"
            title={file.filename}
            allow="autoplay"
          />
        </div>
      );
    }

    // PDF with react-pdf
    if (mimeType === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')) {
      return (
        <div className="bg-gray-900 rounded-lg p-2 md:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2 md:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-2 md:py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded text-sm transition-colors min-h-[44px] md:min-h-[auto]"
              >
                Previous
              </button>
              <span className="text-sm text-gray-300 whitespace-nowrap">
                Page {pageNumber} of {numPages || '?'}
              </span>
              <button
                onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
                disabled={!numPages || pageNumber >= numPages}
                className="px-3 py-2 md:py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded text-sm transition-colors min-h-[44px] md:min-h-[auto]"
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                className="px-3 py-2 md:py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors min-h-[44px] md:min-h-[auto]"
              >
                −
              </button>
              <span className="text-sm text-gray-300 whitespace-nowrap">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
                className="px-3 py-2 md:py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors min-h-[44px] md:min-h-[auto]"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex justify-center overflow-auto max-h-[700px] bg-gray-800 rounded">
            <Document
              file={file.storage_path}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(error) => console.error('PDF load error:', error)}
              loading={
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      );
    }

    // Images with pinch-zoom support on mobile
    if (fileType === 'image') {
      return (
        <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4 overflow-auto">
          <img
            src={file.storage_path}
            alt={file.filename}
            className="max-w-full max-h-[800px] md:max-h-[600px] object-contain rounded touch-pinch-zoom"
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>
      );
    }

    // Audio
    if (fileType === 'audio') {
      return (
        <div className="bg-gray-900 rounded-lg p-6">
          <audio controls className="w-full mb-6">
            <source src={file.storage_path} type={file.mime_type} />
            Your browser does not support the audio element.
          </audio>
          {file.processing_result?.transcription && (
            <div className="bg-gray-800 rounded p-4">
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
          <video controls className="w-full max-h-[800px]">
            <source src={file.storage_path} type={file.mime_type} />
            Your browser does not support the video element.
          </video>
        </div>
      );
    }

    // Text files and documents with extracted content
    if (
      fileType === 'text' ||
      file.processing_result?.content ||
      file.processing_result?.contentPreview
    ) {
      const content =
        file.processing_result?.content || file.processing_result?.contentPreview || '';

      return (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[800px]">
          <div className="prose prose-invert max-w-none">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded">
              {content}
            </pre>
          </div>
        </div>
      );
    }

    // Spreadsheet preview
    if (file.processing_result?.preview && Array.isArray(file.processing_result.preview)) {
      return (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[800px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-300">
              <tbody>
                {file.processing_result.preview.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-gray-700">
                    {Object.values(row).map((cell: any, j: number) => (
                      <td key={j} className="px-3 py-2 border-r border-gray-700">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Fallback - download button
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Filename</label>
            <p className="text-sm text-white break-all">{file.filename}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">File Size</label>
            <p className="text-sm text-white">
              {file.file_size < 1024
                ? `${file.file_size} B`
                : file.file_size < 1024 * 1024
                ? `${(file.file_size / 1024).toFixed(2)} KB`
                : `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">MIME Type</label>
            <p className="text-sm text-white">{file.mime_type}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Source</label>
            <p className="text-sm text-white capitalize">{file.file_source.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Created</label>
            <p className="text-sm text-white">{new Date(file.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Processed</label>
            <p className="text-sm text-white">
              {file.processed ? (
                <span className="text-green-400">Yes</span>
              ) : (
                <span className="text-yellow-400">No</span>
              )}
            </p>
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
                <span
                  key={idx}
                  className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded"
                >
                  {proj}
                </span>
              ))}
            </div>
          </div>
        )}

        {file.source_metadata && Object.keys(file.source_metadata).length > 0 && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">Source Metadata</label>
            <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded overflow-auto max-h-60">
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
        <h3 className="text-sm font-semibold text-white mb-4">
          Related Files ({relatedFiles.length})
        </h3>
        <div className="space-y-2">
          {relatedFiles.map((relFile) => (
            <div
              key={relFile.id}
              className="bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => {
                setFile(relFile as any);
                setPageNumber(1);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{relFile.filename}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span>{(relFile.file_size / 1024).toFixed(2)} KB</span>
                    <span>•</span>
                    <span className="capitalize">{relFile.file_source.replace(/_/g, ' ')}</span>
                    {relFile.similarity && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">
                          {Math.round(relFile.similarity * 100)}% similar
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search within this file..."
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white mb-2">
              Results ({searchResults.length})
            </h4>
            {searchResults.map((result, idx) => (
              <div key={idx} className="bg-gray-800 p-3 rounded">
                <p className="text-sm text-gray-300">{result.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>Similarity: {Math.round(result.similarity * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !searchLoading && (
          <div className="text-center text-gray-400 py-8">No results found</div>
        )}
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-white truncate mb-1">{file.filename}</h2>
          <p className="text-sm text-gray-400">
            {file.file_size < 1024
              ? `${file.file_size} B`
              : file.file_size < 1024 * 1024
              ? `${(file.file_size / 1024).toFixed(2)} KB`
              : `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`}{' '}
            • {file.mime_type}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Tabs - Scrollable on mobile */}
      <div className="flex gap-2 border-b border-gray-700 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-3 md:py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
            className={`px-4 py-3 md:py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
            className={`px-4 py-3 md:py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'related'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Related ({relatedFiles.length})
          </button>
        )}
        {showSearch && (
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-3 md:py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'search'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Search
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'metadata' && renderMetadata()}
        {activeTab === 'related' && renderRelated()}
        {activeTab === 'search' && renderSearch()}
      </div>
    </div>
  );
}
