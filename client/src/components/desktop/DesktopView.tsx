import React, { useEffect, useRef, useState } from 'react';
import { Server } from '../../types';
import Guacamole from 'guacamole-common-js';
import { Monitor, Maximize2, RefreshCw, AlertCircle, ShieldCheck, Terminal, Keyboard } from 'lucide-react';

interface DesktopViewProps {
  server: Server;
}

export const DesktopView: React.FC<DesktopViewProps> = ({ server }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);
  const mouseRef = useRef<Guacamole.Mouse | null>(null);
  const keyboardRef = useRef<Guacamole.Keyboard | null>(null);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const protocol = server.desktop_protocol || 'rdp';
  const port = server.desktop_port || (protocol === 'vnc' ? 5900 : 3389);

  const connect = () => {
    if (!containerRef.current) return;

    setStatus('connecting');
    setErrorMessage(null);

    // Clean up existing client
    if (clientRef.current) {
      try {
        clientRef.current.disconnect();
      } catch {
        // Ignore
      }
    }

    // Clear display container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? `${wsProtocol}//${window.location.hostname}:3001`
      : `${wsProtocol}//${window.location.host}`;

    const width = containerRef.current.clientWidth || 1920;
    const height = containerRef.current.clientHeight || 1080;

    const tunnelUrl = `${wsHost}/ws/desktop?serverId=${server.id}&width=${width}&height=${height}`;
    console.log('[Guacamole] Tunnel URL:', tunnelUrl);

    try {
      const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
      const client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      // Handle client state changes
      client.onerror = (err: any) => {
        console.error('[Guacamole Client Error]:', err);
        setStatus('error');
        const msg = typeof err === 'object' && err.message ? err.message : String(err);
        setErrorMessage(msg || 'Connection error. Ensure guacd is running on port 4822.');
      };

      client.onstatechange = (state: number) => {
        // 0: IDLE, 1: CONNECTING, 2: WAITING, 3: CONNECTED, 4: DISCONNECTING, 5: DISCONNECTED
        console.log('[Guacamole State]:', state);
        if (state === 3) {
          setStatus('connected');
        } else if (state === 5) {
          setStatus('disconnected');
        }
      };

      // Append display element
      const displayEl = client.getDisplay().getElement();
      displayEl.style.width = '100%';
      displayEl.style.height = '100%';
      displayEl.style.objectFit = 'contain';
      containerRef.current.appendChild(displayEl);

      // Mouse input setup
      const mouse = new Guacamole.Mouse(displayEl);
      mouseRef.current = mouse;

      mouse.onEach(['mousedown', 'mousemove', 'mouseup'], (e: any) => {
        client.sendMouseState(e.state);
      });

      // Keyboard input setup
      const keyboard = new Guacamole.Keyboard(document);
      keyboardRef.current = keyboard;

      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
      };

      keyboard.onkeyup = (keysym: number) => {
        client.sendKeyEvent(0, keysym);
      };

      // Connect
      client.connect();
    } catch (err: any) {
      console.error('[Guacamole Init Exception]:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to initialize Remote Desktop tunnel.');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (keyboardRef.current) {
        keyboardRef.current.onkeydown = null;
        keyboardRef.current.onkeyup = null;
      }
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
        } catch {
          // Ignore
        }
      }
    };
  }, [server.id]);

  const sendCtrlAltDel = () => {
    if (!clientRef.current) return;
    const client = clientRef.current;
    // Keysyms: Ctrl (65507), Alt (65513), Delete (65535)
    client.sendKeyEvent(1, 65507);
    client.sendKeyEvent(1, 65513);
    client.sendKeyEvent(1, 65535);
    client.sendKeyEvent(0, 65535);
    client.sendKeyEvent(0, 65513);
    client.sendKeyEvent(0, 65507);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] rounded-xl overflow-hidden border border-[#2b2b2b] shadow-2xl relative">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-[#2b2b2b] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-200">{server.name}</span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {server.host}:{port}
            </span>
          </div>

          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {protocol} Protocol (NLA)
          </span>

          {/* Connection Status Badge */}
          {status === 'connecting' && (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Connecting...
            </span>
          )}
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          )}
          {(status === 'disconnected' || status === 'error') && (
            <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {status === 'error' ? 'Error' : 'Disconnected'}
            </span>
          )}
        </div>

        {/* Toolbar Action Controls */}
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <button
              onClick={sendCtrlAltDel}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded font-medium transition-all border border-slate-700"
              title="Send Ctrl+Alt+Del"
            >
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              Ctrl+Alt+Del
            </button>
          )}

          <button
            onClick={connect}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded font-medium transition-all border border-slate-700"
            title="Reconnect Session"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            Reconnect
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded font-medium transition-all border border-slate-700"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Main Canvas View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {status === 'error' && (
          <div className="absolute z-20 max-w-md p-6 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-rose-500/30 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Remote Desktop Connection Failed</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {errorMessage || 'Unable to establish RDP/VNC connection.'}
            </p>
            <div className="text-left bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 mb-4 overflow-x-auto">
              <div className="text-sky-400 font-semibold mb-1">💡 Requirements Check:</div>
              <div>1. Ensure guacd Docker container is running:</div>
              <div className="text-emerald-400 py-1">docker run -d -p 4822:4822 guacamole/guacd</div>
              <div>2. Verify Windows RDP (port 3389) or Linux VNC is enabled on host ({server.host}).</div>
            </div>
            <button
              onClick={connect}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/30"
            >
              Retry Connection
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center cursor-crosshair select-none"
        />
      </div>
    </div>
  );
};
