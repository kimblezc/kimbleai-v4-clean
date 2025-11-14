'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';
import { CodeBlock } from './ui/CodeBlock';

interface FormattedMessageProps {
  content: string;
  role?: 'user' | 'assistant';
}

export default function FormattedMessage({ content, role = 'assistant' }: FormattedMessageProps) {
  if (role === 'user') {
    // User messages are plain text, no formatting needed
    return (
      <div style={{
        fontSize: '15px',
        lineHeight: '1.5',
        color: '#ffffff',
        whiteSpace: 'pre-wrap'
      }}>
        {content}
      </div>
    );
  }

  // Assistant messages get full markdown formatting
  return (
    <div className="formatted-response">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              marginTop: '20px',
              borderBottom: '2px solid #333',
              paddingBottom: '8px'
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '12px',
              marginTop: '16px'
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#00d4aa',
              marginBottom: '10px',
              marginTop: '14px'
            }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#4a9eff',
              marginBottom: '8px',
              marginTop: '12px'
            }}>
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#ffffff',
              marginBottom: '12px',
              marginTop: 0
            }}>
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul style={{
              paddingLeft: '20px',
              marginBottom: '12px',
              color: '#ffffff'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              paddingLeft: '20px',
              marginBottom: '12px',
              color: '#ffffff'
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{
              marginBottom: '4px',
              lineHeight: '1.5'
            }}>
              {children}
            </li>
          ),

          // Code blocks with copy button
          code: (props: any) => {
            const { inline, className, children } = props;
            // Extract language from className (format: language-xxx)
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : undefined;
            const code = String(children).replace(/\n$/, '');

            return (
              <CodeBlock
                code={code}
                language={language}
                inline={inline}
                className={className}
              >
                {children}
              </CodeBlock>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '4px solid #4a9eff',
              paddingLeft: '16px',
              marginLeft: '0',
              marginBottom: '12px',
              color: '#ccc',
              fontStyle: 'italic'
            }}>
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
              <table style={{
                borderCollapse: 'collapse',
                width: '100%',
                border: '1px solid #333'
              }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{
              border: '1px solid #333',
              padding: '8px 12px',
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              fontWeight: '600',
              textAlign: 'left'
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              border: '1px solid #333',
              padding: '8px 12px',
              color: '#ffffff'
            }}>
              {children}
            </td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#4a9eff',
                textDecoration: 'underline'
              }}
            >
              {children}
            </a>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong style={{
              color: '#ffffff',
              fontWeight: '600'
            }}>
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em style={{
              color: '#ccc',
              fontStyle: 'italic'
            }}>
              {children}
            </em>
          ),

          // Horizontal rule
          hr: () => (
            <hr style={{
              border: 'none',
              borderTop: '1px solid #333',
              margin: '16px 0'
            }} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}