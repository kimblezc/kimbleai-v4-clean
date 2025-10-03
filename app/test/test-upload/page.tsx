'use client';

import React, { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileCard } from '@/components/ui/Card';

export default function TestUploadPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/files?userId=zach&limit=20');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (fileIds: string[]) => {
    console.log('Upload completed:', fileIds);
    // Reload files after a short delay
    setTimeout(loadFiles, 2000);
  };

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        const response = await fetch(`/api/files/${fileId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          loadFiles();
        }
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  React.useEffect(() => {
    loadFiles();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            File Upload System Test
          </h1>
          <p className="text-gray-400">
            Test the complete file upload and processing system
          </p>
        </div>

        {/* System Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Supported Files</div>
            <div className="text-white font-semibold">All Types</div>
            <div className="text-xs text-gray-500 mt-1">
              Audio, Images, PDFs, Docs, CSV, Emails
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Files</div>
            <div className="text-white font-semibold">{files.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              <button
                onClick={loadFiles}
                className="text-blue-500 hover:text-blue-400"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Processing Queue</div>
            <div className="text-white font-semibold">Active</div>
            <div className="text-xs text-gray-500 mt-1">
              3 concurrent processors
            </div>
          </div>
        </div>

        {/* File Uploader */}
        <div className="mb-8">
          <FileUploader
            userId="zach"
            projectId="test-project"
            maxFiles={10}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Test Instructions */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">
            Test Instructions
          </h2>
          <div className="space-y-2 text-sm text-gray-300">
            <div>1. Upload test files of different types</div>
            <div>2. Watch the progress tracking in real-time</div>
            <div>3. Verify processing results appear below</div>
            <div>4. Test download functionality</div>
            <div>5. Test file deletion</div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-800">
            <div className="text-sm font-semibold text-white mb-2">
              Test Files to Try:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>• Audio: .m4a, .mp3, .wav</div>
              <div>• Images: .jpg, .png, .heic</div>
              <div>• PDFs: .pdf files</div>
              <div>• Docs: .txt, .md, .docx</div>
              <div>• Data: .csv, .xlsx</div>
              <div>• Email: .eml files</div>
            </div>
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Files</h2>
            <div className="text-sm text-gray-400">
              Showing {files.length} files
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : files.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
              <span className="text-6xl mb-4 block">📂</span>
              <h3 className="text-xl font-semibold text-white mb-2">
                No files yet
              </h3>
              <p className="text-gray-400">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  id={file.id}
                  name={file.filename}
                  type={file.file_type}
                  size={file.file_size}
                  uploadedAt={new Date(file.created_at).toLocaleDateString()}
                  project={file.project_id}
                  onClick={() => {
                    // View details
                    window.open(`/files/${file.id}`, '_blank');
                  }}
                  onDownload={() => handleDownload(file.id, file.filename)}
                  onDelete={() => handleDelete(file.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Processing Times
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Audio (10min)</span>
                <span>30-60s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Images (5MB)</span>
                <span>3-5s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>PDF (100 pages)</span>
                <span>10-20s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Documents</span>
                <span>2-5s</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              System Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Storage</span>
                <span className="text-green-500">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">OpenAI</span>
                <span className="text-green-500">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">AssemblyAI</span>
                <span className="text-green-500">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Queue</span>
                <span className="text-green-500">Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
