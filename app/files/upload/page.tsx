'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import FileUploader from '../../../components/FileUploader';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';

export default function FileUploadPage() {
  const router = useRouter();
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);

  const handleUploadComplete = (fileIds: string[]) => {
    setUploadedFileIds(fileIds);
    setUploadComplete(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Upload Files</h1>
            <p className="text-gray-400">
              Upload and process files to make them searchable through AI
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/files')}
          >
            View All Files
          </Button>
        </div>

        {/* Upload Instructions */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            Supported File Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">Audio Files</h4>
              <p className="text-gray-400">
                .m4a, .mp3, .wav, .flac, .ogg
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Auto-transcribed with speaker diarization
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Images</h4>
              <p className="text-gray-400">
                .jpg, .png, .heic, .webp, .gif
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Analyzed with AI Vision and OCR
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Documents</h4>
              <p className="text-gray-400">
                .pdf, .docx, .txt, .md
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Full text extraction and indexing
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Spreadsheets</h4>
              <p className="text-gray-400">
                .csv, .xlsx
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Data extraction and search
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Email Files</h4>
              <p className="text-gray-400">
                .eml, .msg
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Header and content parsing
              </p>
            </div>
          </div>
        </div>

        {/* File Uploader Component */}
        <FileUploader
          userId="zach"
          projectId="general"
          onUploadComplete={handleUploadComplete}
          maxFiles={10}
        />

        {/* Upload Success Message */}
        {uploadComplete && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-green-300">
                  Upload Complete!
                </h3>
                <p className="text-gray-400">
                  {uploadedFileIds.length} file(s) processed and indexed
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Your files are now searchable through the AI chat interface. Try asking:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                <li>&quot;Show me my recently uploaded files&quot;</li>
                <li>&quot;Search my PDFs for [topic]&quot;</li>
                <li>&quot;What was discussed in my audio recordings?&quot;</li>
                <li>&quot;Find all images with error messages&quot;</li>
                <li>&quot;Organize my files by project&quot;</li>
              </ul>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => router.push('/chat')}
                variant="primary"
              >
                Go to Chat
              </Button>
              <Button
                onClick={() => router.push('/files')}
                variant="secondary"
              >
                View Files
              </Button>
              <Button
                onClick={() => {
                  setUploadComplete(false);
                  setUploadedFileIds([]);
                }}
                variant="secondary"
              >
                Upload More
              </Button>
            </div>
          </div>
        )}

        {/* Features Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            What Happens After Upload?
          </h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">🎵</span>
              <div>
                <p className="font-medium text-white">Audio Processing</p>
                <p>Transcribed with AssemblyAI, including speaker identification and timestamps</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">🖼️</span>
              <div>
                <p className="font-medium text-white">Image Analysis</p>
                <p>Analyzed with OpenAI Vision, OCR for text extraction, thumbnail generation</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">📄</span>
              <div>
                <p className="font-medium text-white">PDF & Document Processing</p>
                <p>Full text extraction, page-by-page indexing, searchable content</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">📊</span>
              <div>
                <p className="font-medium text-white">Spreadsheet Parsing</p>
                <p>Data extraction from all sheets, searchable row and column data</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">📧</span>
              <div>
                <p className="font-medium text-white">Email Parsing</p>
                <p>Extract headers (from, to, subject, date), body content, and attachment lists</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">🔍</span>
              <div>
                <p className="font-medium text-white">AI-Powered Search</p>
                <p>All content is embedded and made searchable through natural language queries in the chat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Size Limits */}
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-300 mb-2">File Size Limits</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400">
            <div>Audio: 2GB max</div>
            <div>Images: 50MB max</div>
            <div>Documents: 100MB max</div>
            <div>PDFs: 100MB max</div>
            <div>Spreadsheets: 50MB max</div>
            <div>Emails: 50MB max</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
