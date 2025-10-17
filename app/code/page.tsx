'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Disable SSR for components that use browser APIs
const CodeEditor = dynamic(() => import('@/components/code/CodeEditor'), { ssr: false });
const FileExplorer = dynamic(() => import('@/components/code/FileExplorer'), { ssr: false });
const Terminal = dynamic(() => import('@/components/code/Terminal'), { ssr: false });
const AIAssistant = dynamic(() => import('@/components/code/AIAssistant'), { ssr: false });
const GitHubPanel = dynamic(() => import('@/components/code/GitHubPanel'), { ssr: false });

export default function CodePage() {
  const { data: session, status } = useSession();
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
    language: string;
  } | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [currentRepo, setCurrentRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/auth/signin';
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg z-50 max-w-md">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar - File Explorer */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Code Editor</h1>
          <p className="text-xs text-gray-400 mt-1">
            AI-Powered Development
          </p>
        </div>

        <GitHubPanel
          onRepoSelect={(repo) => setCurrentRepo(repo)}
          onFilesLoad={(loadedFiles) => setFiles(loadedFiles)}
        />

        <FileExplorer
          files={files}
          onFileSelect={setSelectedFile}
          currentRepo={currentRepo}
        />

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            {showTerminal ? '✕ Close' : '⌘ Terminal'}
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            {showAI ? '✕ Close' : '🤖 AI Assistant'}
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            {selectedFile && (
              <>
                <span className="text-sm text-gray-400">
                  {selectedFile.path}
                </span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {selectedFile.language}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">
              {session.user?.email}
            </span>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex overflow-hidden">
          <CodeEditor
            file={selectedFile}
            onSave={(content) => {
              console.log('Saving file:', selectedFile?.path, content);
              // TODO: Implement save functionality
            }}
          />

          {/* Right Sidebar - AI Assistant */}
          {showAI && (
            <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-hidden">
              <AIAssistant
                currentFile={selectedFile}
                onCodeGenerated={(code) => {
                  console.log('AI generated code:', code);
                  // TODO: Apply code to editor
                }}
              />
            </div>
          )}
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="h-64 bg-black border-t border-gray-700 flex-shrink-0 overflow-hidden">
            <Terminal />
          </div>
        )}
      </div>
    </div>
  );
}
