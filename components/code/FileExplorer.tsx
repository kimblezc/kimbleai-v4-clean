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
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            paddingLeft: `${depth * 12 + 12}px`,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            opacity: isLoading ? 0.5 : 1
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => handleFileClick(file)}
        >
          <span style={{ marginRight: '8px', fontSize: '11px' }}>{getFileIcon(file)}</span>
          <span style={{
            fontSize: '12px',
            color: '#e5e5e5',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {file.name}
          </span>
          {isLoading && (
            <span style={{ fontSize: '11px', color: '#4a9eff' }}>...</span>
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
      <div style={{
        flex: 1,
        padding: '16px',
        textAlign: 'center',
        color: '#888',
        fontSize: '12px'
      }}>
        Select a repository to view files
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{
        flex: 1,
        padding: '16px',
        textAlign: 'center',
        color: '#888',
        fontSize: '12px'
      }}>
        Loading files...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #333'
      }}>
        <span style={{
          fontSize: '11px',
          color: '#888',
          textTransform: 'uppercase',
          fontWeight: '600'
        }}>
          Files
        </span>
      </div>
      {files.map((file) => renderFile(file))}
    </div>
  );
}
