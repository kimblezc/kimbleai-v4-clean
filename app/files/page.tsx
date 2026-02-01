/**
 * Files Page
 *
 * D&D-themed file management (Knowledge Library)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  DocumentIcon,
  PhotoIcon,
  MusicalNoteIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { DocumentIcon as DocumentSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface File {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  public_url: string;
  summary?: string;
  created_at: string;
}

export default function FilesPage() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  useEffect(() => {
    if (session) {
      fetchFiles();
    }
  }, [session]);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('extractText', 'true');
        formData.append('summarize', 'true');
        formData.append('generateEmbedding', 'true');

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return PhotoIcon;
    if (mimeType.startsWith('audio/')) return MusicalNoteIcon;
    return DocumentIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="inline-block animate-spin-slow">
              <DocumentIcon className="w-12 h-12 text-purple-500" />
            </div>
            <p className="mt-4 text-gray-400">Loading library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <header className="px-6 py-6 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gradient">Knowledge Library</h1>
              <p className="text-gray-400 mt-1">Your collection of scrolls and tomes</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-arcane text-white rounded-lg hover:shadow-arcane-lg transition-all disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </header>

        {/* Files Grid */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DocumentSolidIcon className="w-20 h-20 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {searchQuery ? 'No files found' : 'Your library is empty'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first file to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-arcane text-white rounded-lg hover:shadow-arcane-lg transition-all"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Upload File
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.mime_type);
                const isImage = file.mime_type.startsWith('image/');

                return (
                  <div
                    key={file.id}
                    className="group card-dnd overflow-hidden hover:scale-105 transition-all duration-200 cursor-pointer"
                  >
                    {/* Preview */}
                    <div className="relative h-40 bg-gray-900 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          src={file.public_url}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon className="w-16 h-16 text-purple-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-white mb-1 truncate">
                        {file.file_name}
                      </h3>

                      {file.summary && (
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {file.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}
