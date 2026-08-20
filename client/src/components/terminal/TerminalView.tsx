import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Server } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Terminal, RefreshCw, Trash2, Maximize2 } from 'lucide-react';

interface TerminalViewProps {
  server: Server;
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#007acc',
  selectionBackground: 'rgba(0, 122, 204, 0.4)',
  black: '#1e1e1e',
  red: '#f44747',
  green: '#6a9955',
  yellow: '#d7ba7d',
  blue: '#569cd6',
  magenta: '#c586c0',
  cyan: '#4ec9b0',
  white: '#d4d4d4',
  brightBlack: '#808080',
  brightRed: '#f44747',
  brightGreen: '#b5cea8',
  brightYellow: '#ce9178',
  brightBlue: '#9cdcfe',
  brightMagenta: '#d8a0df',
  brightCyan: '#4ec9b0',
  brightWhite: '#ffffff',
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#333333',
  cursor: '#005fb8',
  selectionBackground: 'rgba(0, 95, 184, 0.25)',
  black: '#000000',
  red: '#cd3131',
  green: '#008000',
  yellow: '#795e26',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b58b00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

export const TerminalView: React.FC<TerminalViewProps> = ({ server }) => {
  const { resolvedTheme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState('Initializing terminal session...');

  const connectWebSocket = () => {
    if (!server) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    if (xtermRef.current) {
      xtermRef.current.reset();
    }

    if (fitAddonRef.current && xtermRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch {
        // Ignore if element is not rendered yet
      }
    }

    const cols = xtermRef.current?.cols || 80;
    const rows = xtermRef.current?.rows || 24;

    const envWsBase = import.meta.env.VITE_WS_BASE_URL;
    let wsUrl: string;
    if (envWsBase) {
      wsUrl = `${envWsBase}/terminal?serverId=${server.id}&cols=${cols}&rows=${rows}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/terminal?serverId=${server.id}&cols=${cols}&rows=${rows}`;
    }

    setStatusText(`Connecting to ${server.name} (${server.host})...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const sendResize = () => {
      if (ws.readyState === WebSocket.OPEN && xtermRef.current && fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
          const currentCols = xtermRef.current.cols;
          const currentRows = xtermRef.current.rows;
          ws.send(JSON.stringify({ type: 'resize', cols: currentCols, rows: currentRows }));
        } catch {
          // Ignore fit errors
        }
      }
    };

    ws.onopen = () => {
      setConnected(true);
      sendResize();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write(msg.data);
        } else if (msg.type === 'status') {
          setStatusText(msg.data.trim());
          if (xtermRef.current) xtermRef.current.write(`\r\n\x1b[36m[Remotely] ${msg.data}\x1b[0m`);
          // When backend confirms SSH session is ready, re-sync terminal size
          if (typeof msg.data === 'string' && msg.data.includes('Connected to')) {
            sendResize();
          }
        } else if (msg.type === 'error') {
          setStatusText(`Error: ${msg.data.trim()}`);
          if (xtermRef.current) xtermRef.current.write(`\r\n\x1b[31m[Remotely Error] ${msg.data}\x1b[0m`);
        }
      } catch {
        if (xtermRef.current) {
          xtermRef.current.write(event.data);
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setStatusText('Session closed.');
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[33m[Remotely] Connection closed.\x1b[0m\r\n');
      }
    };

    ws.onerror = () => {
      setConnected(false);
      setStatusText('WebSocket error.');
    };
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: resolvedTheme === 'dark' ? darkTheme : lightTheme,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      letterSpacing: 0,
      lineHeight: 1.2,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    try {
      fitAddon.fit();
    } catch {
      // Ignore
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'resize',
                cols: xtermRef.current.cols,
                rows: xtermRef.current.rows,
              })
            );
          }
        } catch {
          // Ignore
        }
      }
    };

    const container = terminalRef.current;
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (container) {
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', handleResize);

    connectWebSocket();

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, [server.id]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
    }
  }, [resolvedTheme]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleFit = () => {
    if (fitAddonRef.current && xtermRef.current) {
      try {
        fitAddonRef.current.fit();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'resize',
              cols: xtermRef.current.cols,
              rows: xtermRef.current.rows,
            })
          );
        }
      } catch {
        // Ignore
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-[#2b2b2b] shadow-2xl overflow-hidden transition-colors duration-200">
      {/* Terminal Toolbar */}
      <div className="h-10 bg-slate-100 dark:bg-[#181818] border-b border-slate-200 dark:border-[#2b2b2b] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
          <Terminal className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="font-semibold">{server.username}@{server.host}</span>
          <span className="text-slate-400 dark:text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">{statusText}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={connectWebSocket}
            className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 px-2 py-1 rounded border border-slate-300/60 dark:border-zinc-700/50 transition-colors"
            title="Reconnect Session"
          >
            <RefreshCw className={`w-3 h-3 ${connected ? '' : 'text-amber-500 dark:text-amber-400'}`} />
            {connected ? 'Reconnect' : 'Connect'}
          </button>

          <button
            onClick={handleClear}
            className="text-[11px] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 px-2 py-1 rounded border border-slate-300/60 dark:border-zinc-700/50 transition-colors flex items-center gap-1"
            title="Clear Screen"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>

          <button
            onClick={handleFit}
            className="text-[11px] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 px-2 py-1 rounded border border-slate-300/60 dark:border-zinc-700/50 transition-colors flex items-center gap-1"
            title="Fit Canvas"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 p-2 relative overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};

