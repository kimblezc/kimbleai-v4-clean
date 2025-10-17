'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Minimal Monaco Editor wrapper
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CodePage() {
  const { data: session, status } = useSession();
  const [code, setCode] = useState('// Select a file from GitHub or start coding...');
  const [language, setLanguage] = useState('javascript');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/auth/signin';
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-sm">Loading Code Editor...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Simple Header */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Code Editor</h1>
          <span className="text-xs text-gray-400">{session.user?.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.href = '/'}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Monaco Editor - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            rulers: [],
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Simple Footer */}
      <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Language: {language}</span>
          <span>Lines: {code.split('\n').length}</span>
          <button
            onClick={() => {
              const langs = ['javascript', 'typescript', 'python', 'html', 'css', 'json'];
              const currentIndex = langs.indexOf(language);
              const nextLang = langs[(currentIndex + 1) % langs.length];
              setLanguage(nextLang);
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            Change Language
          </button>
        </div>
      </div>
    </div>
  );
}
