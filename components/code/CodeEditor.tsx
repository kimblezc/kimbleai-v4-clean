'use client';

import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  file: {
    path: string;
    content: string;
    language: string;
  } | null;
  onSave: (content: string) => void;
}

export default function CodeEditor({ file, onSave }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add keyboard shortcut for save (Ctrl+S or Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const content = editor.getValue();
      onSave(content);
    });
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      dockerfile: 'dockerfile',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <p className="text-sm">Select a file to start editing</p>
          <p className="text-xs mt-2 text-gray-500">
            Or create a new file from the file explorer
          </p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-xs">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-gray-900">
      <Editor
        height="100%"
        language={getLanguage(file.path)}
        value={file.content}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        loading={
          <div className="h-full w-full flex items-center justify-center bg-gray-900">
            <div className="text-gray-400 text-xs">Loading editor...</div>
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          folding: true,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
