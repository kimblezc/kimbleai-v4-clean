'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface CodeBlockProps {
  code: string;
  language?: string;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Code block component with copy-to-clipboard functionality
 * Shows visual feedback (checkmark) when code is copied
 */
export function CodeBlock({ code, language, inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#4a9eff',
          border: '1px solid #333',
        },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid #333',
        },
      });
    }
  };

  // Inline code (no copy button)
  if (inline) {
    return (
      <code
        className={className}
        style={{
          backgroundColor: '#2a2a2a',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#4a9eff',
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        }}
      >
        {children || code}
      </code>
    );
  }

  // Block code with copy button
  return (
    <div className="relative group" style={{ marginBottom: '12px' }}>
      {/* Copy button - appears on hover */}
      <button
        onClick={copyCode}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        title="Copy code"
        style={{
          minWidth: '36px',
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {copied ? (
          // Checkmark icon (success)
          <svg
            className="w-4 h-4 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Copy icon (default)
          <svg
            className="w-4 h-4 text-gray-300"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        )}
      </button>

      {/* Code block */}
      <pre
        className={className}
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '12px',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <code
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            lineHeight: '1.5',
          }}
        >
          {children || code}
        </code>
      </pre>

      {/* Language indicator (if provided) */}
      {language && (
        <div
          className="absolute top-2 left-2 px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          }}
        >
          {language}
        </div>
      )}
    </div>
  );
}
