'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  isFolder: boolean;
  parents?: string[];
  owner: string;
}

interface Folder {
  id: string;
  name: string;
  parents?: string[];
}

export function GoogleDriveBrowser() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([{ id: 'root', name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const userId = session?.user?.email?.includes('zach') ? 'zach' : 'rebecca';

  useEffect(() => {
    if (session) {
      loadFiles();
    }
  }, [session, currentFolder]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = currentFolder
        ? `/api/google/drive?action=list&userId=${userId}&folderId=${currentFolder}`
        : `/api/google/drive?action=list&userId=${userId}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async () => {
    if (!searchQuery.trim()) {
      loadFiles();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/google/drive?action=search&userId=${userId}&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (folder: DriveFile) => {
    setCurrentFolder(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const navigateToFolder = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolder(index === 0 ? null : newPath[index].id);
  };

  const importToKnowledge = async (file: DriveFile) => {
    setImporting(file.id);
    try {
      const response = await fetch('/api/google/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: file.name,
          userId,
          projectId: 'drive-import'
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`File "${file.name}" imported to knowledge base successfully!`);
      } else {
        alert('Failed to import file: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error importing file: ' + err);
    } finally {
      setImporting(null);
    }
  };

  const viewFile = async (file: DriveFile) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    }
  };

  const downloadFile = async (file: DriveFile) => {
    try {
      const response = await fetch(
        `/api/google/drive?action=download&userId=${userId}&fileId=${file.id}`
      );
      const data = await response.json();
      if (data.success) {
        const blob = new Blob([data.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download file: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error downloading file: ' + err);
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '-';
    const size = parseInt(bytes);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (file: DriveFile) => {
    if (file.isFolder) return '📁';
    if (file.mimeType.includes('document')) return '📄';
    if (file.mimeType.includes('spreadsheet')) return '📊';
    if (file.mimeType.includes('presentation')) return '📽️';
    if (file.mimeType.includes('image')) return '🖼️';
    if (file.mimeType.includes('video')) return '🎥';
    if (file.mimeType.includes('audio')) return '🎵';
    if (file.mimeType.includes('pdf')) return '📕';
    return '📄';
  };

  if (!session) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-400">Please sign in to browse your Google Drive</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <Card>
        <div className="flex gap-2 items-center">
          {/* Breadcrumb Navigation */}
          <div className="flex-1 flex items-center gap-1 text-sm">
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center gap-1">
                {index > 0 && <span className="text-gray-600">/</span>}
                <button
                  onClick={() => navigateToFolder(index)}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border border-gray-700 rounded">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="Search Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchFiles()}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={searchFiles} disabled={loading}>
            Search
          </Button>
          {searchQuery && (
            <Button variant="secondary" onClick={() => { setSearchQuery(''); loadFiles(); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* File List/Grid */}
      <Card className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No files found</div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => file.isFolder ? openFolder(file) : setSelectedFile(file)}
              >
                <span className="text-2xl">{getFileIcon(file)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {file.owner} • {formatDate(file.modifiedTime)}
                  </div>
                </div>
                <div className="text-sm text-gray-400">{formatSize(file.size)}</div>
                {!file.isFolder && (
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewFile(file);
                      }}
                    >
                      View
                    </button>
                    <button
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        importToKnowledge(file);
                      }}
                      disabled={importing === file.id}
                    >
                      {importing === file.id ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => file.isFolder ? openFolder(file) : setSelectedFile(file)}
              >
                {file.thumbnailLink ? (
                  <img
                    src={file.thumbnailLink}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-900 rounded mb-2">
                    <span className="text-5xl">{getFileIcon(file)}</span>
                  </div>
                )}
                <div className="text-sm font-medium text-white truncate mb-1">{file.name}</div>
                <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFile(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white pr-4">{selectedFile.name}</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedFile.thumbnailLink && (
              <img
                src={selectedFile.thumbnailLink}
                alt={selectedFile.name}
                className="w-full rounded mb-4"
              />
            )}

            <div className="space-y-2 text-sm mb-4">
              <div>
                <span className="text-gray-500">Type:</span>
                <div className="text-white">{selectedFile.mimeType}</div>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <div className="text-white">{formatSize(selectedFile.size)}</div>
              </div>
              <div>
                <span className="text-gray-500">Owner:</span>
                <div className="text-white">{selectedFile.owner}</div>
              </div>
              <div>
                <span className="text-gray-500">Modified:</span>
                <div className="text-white">{formatDate(selectedFile.modifiedTime)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                fullWidth
                variant="secondary"
                onClick={() => viewFile(selectedFile)}
              >
                Open in Drive
              </Button>
              <Button
                fullWidth
                onClick={() => importToKnowledge(selectedFile)}
                disabled={importing === selectedFile.id}
              >
                {importing === selectedFile.id ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
