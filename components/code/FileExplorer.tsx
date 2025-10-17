'use client';

import React, { useState } from 'react';

interface File {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: File[];
}

interface FileExplorerProps {
  files: File[];
  onFileSelect: (file: { path: string; content: string; language: string }) => void;
  currentRepo: string | null;
}

export default function FileExplorer({
  files,
  onFileSelect,
  currentRepo,
}: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleFileClick = async (file: File) => {
    if (file.type === 'directory') {
      toggleDirectory(file.path);
      return;
    }

    setLoadingFile(file.path);

    try {
      // Fetch file content from GitHub API
      const response = await fetch('/api/code/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: currentRepo,
          path: file.path,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onFileSelect({
          path: file.path,
          content: data.content,
          language: getLanguageFromPath(file.path),
        });
      } else {
        console.error('Failed to load file:', data.error);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setLoadingFile(null);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      java: 'java',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const getFileIcon = (file: File): string => {
    if (file.type === 'directory') {
      return expandedDirs.has(file.path) ? '📂' : '📁';
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      js: '📜',
      jsx: '⚛️',
      ts: '📘',
      tsx: '⚛️',
      py: '🐍',
      rb: '💎',
      go: '🔷',
      java: '☕',
      html: '🌐',
      css: '🎨',
      json: '📋',
      md: '📝',
      png: '🖼️',
      jpg: '🖼️',
      svg: '🎭',
      git: '📌',
    };

    return iconMap[ext || ''] || '📄';
  };

  const renderFile = (file: File, depth: number = 0) => {
    const isExpanded = expandedDirs.has(file.path);
    const isLoading = loadingFile === file.path;

    return (
      <div key={file.path}>
        <div
          className={`flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-700 transition-colors ${
            isLoading ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleFileClick(file)}
        >
          <span className="mr-2 text-sm">{getFileIcon(file)}</span>
          <span className="text-sm text-gray-200 truncate flex-1">
            {file.name}
          </span>
          {isLoading && (
            <span className="text-xs text-blue-400">...</span>
          )}
        </div>

        {file.type === 'directory' && isExpanded && file.children && (
          <div>
            {file.children.map((child) => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentRepo) {
    return (
      <div className="flex-1 p-4 text-center text-gray-400 text-sm">
        Select a repository to view files
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 p-4 text-center text-gray-400 text-sm">
        Loading files...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 bg-gray-700 border-b border-gray-700">
        <span className="text-xs text-gray-400 uppercase font-semibold">
          Files
        </span>
      </div>
      {files.map((file) => renderFile(file))}
    </div>
  );
}
