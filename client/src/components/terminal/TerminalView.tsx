import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Server } from '../../types';
import { Terminal, RefreshCw, Trash2, Maximize2, ShieldAlert } from 'lucide-react';

interface TerminalViewProps {
  server: Server;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ server }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState('Initializing terminal session...');

  const connectWebSocket = () => {
    if (!server) return;

    // Dispose existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (xtermRef.current) {
      xtermRef.current.reset();
    }

    const envWsBase = import.meta.env.VITE_WS_BASE_URL;
    let wsUrl: string;
    if (envWsBase) {
      wsUrl = `${envWsBase}/terminal?serverId=${server.id}&cols=80&rows=24`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/terminal?serverId=${server.id}&cols=80&rows=24`;
    }

    setStatusText(`Connecting to ${server.name} (${server.host})...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (xtermRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
        // Send initial size
        const cols = xtermRef.current.cols;
        const rows = xtermRef.current.rows;
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write(msg.data);
        } else if (msg.type === 'status') {
          setStatusText(msg.data.trim());
          if (xtermRef.current) xtermRef.current.write(`\r\n\x1b[36m[Remotely] ${msg.data}\x1b[0m`);
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

    // Initialize Xterm
    const term = new XTerm({
      cursorBlink: true,
      theme: {
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
      },
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
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle user keystrokes in xterm
    term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
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
      }
    };

    window.addEventListener('resize', handleResize);

    // Connect WS
    connectWebSocket();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, [server.id]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleFit = () => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl border border-[#2b2b2b] shadow-2xl overflow-hidden">
      {/* Terminal Toolbar */}
      <div className="h-10 bg-[#181818] border-b border-[#2b2b2b] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="font-semibold">{server.username}@{server.host}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px] truncate max-w-xs">{statusText}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={connectWebSocket}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-zinc-800/60 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-700/50 transition-colors"
            title="Reconnect Session"
          >
            <RefreshCw className={`w-3 h-3 ${connected ? '' : 'text-amber-400'}`} />
            {connected ? 'Reconnect' : 'Connect'}
          </button>

          <button
            onClick={handleClear}
            className="text-[11px] text-slate-400 hover:text-slate-200 bg-zinc-800/60 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-700/50 transition-colors flex items-center gap-1"
            title="Clear Screen"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>

          <button
            onClick={handleFit}
            className="text-[11px] text-slate-400 hover:text-slate-200 bg-zinc-800/60 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-700/50 transition-colors flex items-center gap-1"
            title="Fit Canvas"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 p-2 relative overflow-hidden bg-[#1e1e1e]">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
