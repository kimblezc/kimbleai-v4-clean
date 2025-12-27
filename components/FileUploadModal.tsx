'use client';

import React from 'react';
import FileUploader from './FileUploader';
import { useRouter } from 'next/navigation';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId?: string;
}

export default function FileUploadModal({
  isOpen,
  onClose,
  userId,
  projectId = 'general'
}: FileUploadModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUploadComplete = (fileIds: string[]) => {
    console.log(`Uploaded ${fileIds.length} files:`, fileIds);
    // Don't auto-close - let user see completion and upload more if needed
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Upload Files</h2>
            <p className="text-sm text-gray-400 mt-1">
              Upload and process files to make them searchable through AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Supported File Types Info */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            Supported File Types
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
            <div>
              <span className="text-white font-medium">Audio:</span> .m4a, .mp3, .wav, .flac, .ogg
            </div>
            <div>
              <span className="text-white font-medium">Images:</span> .jpg, .png, .heic, .webp, .gif
            </div>
            <div>
              <span className="text-white font-medium">Documents:</span> .pdf, .docx, .txt, .md
            </div>
            <div>
              <span className="text-white font-medium">Spreadsheets:</span> .csv, .xlsx
            </div>
            <div>
              <span className="text-white font-medium">Email:</span> .eml, .msg
            </div>
          </div>
        </div>

        {/* File Uploader Component */}
        <FileUploader
          userId={userId}
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
          maxFiles={10}
        />

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Files will be processed and made searchable in the chat
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/files')}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              View All Files
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
