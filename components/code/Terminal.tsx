'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6',
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    // Save references
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('Welcome to KimbleAI Code Editor Terminal');
    term.writeln('Type commands to execute them on the server.');
    term.writeln('');
    term.write('$ ');

    // Command buffer
    let currentCommand = '';

    // Handle input
    term.onData((data) => {
      switch (data) {
        case '\r': // Enter
          term.write('\r\n');
          if (currentCommand.trim()) {
            executeCommand(currentCommand);
          }
          currentCommand = '';
          term.write('$ ');
          break;

        case '\u0003': // Ctrl+C
          term.write('^C\r\n$ ');
          currentCommand = '';
          break;

        case '\u007F': // Backspace
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.slice(0, -1);
            term.write('\b \b');
          }
          break;

        default:
          if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7e)) {
            currentCommand += data;
            term.write(data);
          }
      }
    });

    const executeCommand = async (command: string) => {
      try {
        const response = await fetch('/api/code/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command }),
        });

        const data = await response.json();

        if (data.success) {
          term.write(data.output || '');
        } else {
          term.write(`Error: ${data.error}\r\n`);
        }
      } catch (error) {
        term.write(`Error executing command: ${error}\r\n`);
      }
    };

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div ref={terminalRef} className="h-full w-full bg-black p-2" />
  );
}
