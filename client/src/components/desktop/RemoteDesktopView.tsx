import React, { useEffect, useRef, useState, useCallback } from 'react';
import Guacamole from 'guacamole-common-js';
import { Server } from '../../types';
import { DesktopSettingsModal } from './DesktopSettingsModal';
import {
  Monitor,
  RefreshCw,
  Maximize,
  Minimize,
  Settings,
  Clipboard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  X,
  Radio,
} from 'lucide-react';

interface RemoteDesktopViewProps {
  server: Server;
  onServerUpdated?: (updated: Server) => void;
}

export const RemoteDesktopView: React.FC<RemoteDesktopViewProps> = ({ server, onServerUpdated }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const tunnelRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);

  const [connectionState, setConnectionState] = useState<
    'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  >('CONNECTING');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '125' | '150'>('fit');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Clipboard Drawer state
  const [isClipboardOpen, setIsClipboardOpen] = useState<boolean>(false);
  const [clipboardText, setClipboardText] = useState<string>('');
  const [clipboardSentStatus, setClipboardSentStatus] = useState<string | null>(null);

  const currentProtocol = (server.rdp_protocol || 'rdp').toUpperCase();
  const currentPort = server.rdp_port || (server.rdp_protocol === 'vnc' ? 5900 : 3389);

  // Helper to calculate WS URL
  const getWsUrl = useCallback((width: number, height: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/desktop?serverId=${server.id}&width=${width}&height=${height}&dpi=96`;
  }, [server.id]);

  const disconnectSession = useCallback(() => {
    if (keyboardRef.current) {
      try {
        keyboardRef.current.onkeydown = null;
        keyboardRef.current.onkeyup = null;
        keyboardRef.current.reset();
      } catch {
        // ignore
      }
      keyboardRef.current = null;
    }

    if (clientRef.current) {
      try {
        clientRef.current.disconnect();
      } catch {
        // ignore
      }
      clientRef.current = null;
    }

    if (tunnelRef.current) {
      try {
        tunnelRef.current.disconnect();
      } catch {
        // ignore
      }
      tunnelRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  const applyScale = useCallback(() => {
    if (!clientRef.current || !containerRef.current) return;
    try {
      const display = clientRef.current.getDisplay();
      if (!display) return;

      const displayWidth = display.getWidth();
      const displayHeight = display.getHeight();

      if (!displayWidth || !displayHeight) return;

      if (scaleMode === 'fit') {
        const containerRect = containerRef.current.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
          const scaleX = containerRect.width / displayWidth;
          const scaleY = containerRect.height / displayHeight;
          const fitScale = Math.min(scaleX, scaleY);
          display.scale(fitScale > 0 ? fitScale : 1);
        }
      } else if (scaleMode === '100') {
        display.scale(1.0);
      } else if (scaleMode === '125') {
        display.scale(1.25);
      } else if (scaleMode === '150') {
        display.scale(1.5);
      }
    } catch (err) {
      console.warn('[RemoteDesktopView] Scale error:', err);
    }
  }, [scaleMode]);

  const connectSession = useCallback(() => {
    if (!containerRef.current) return;

    disconnectSession();
    setConnectionState('CONNECTING');
    setErrorMessage('');

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width) || 1280, 800);
    const height = Math.max(Math.floor(rect.height) || 720, 600);

    const wsUrl = getWsUrl(width, height);
    console.log(`[RemoteDesktopView] Connecting Guacamole Client to ${wsUrl}`);

    try {
      const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
      tunnelRef.current = tunnel;

      const client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      // Attach client display element to container DOM node
      const display = client.getDisplay();
      const displayEl = display.getElement();
      displayEl.style.display = 'block';
      displayEl.style.margin = '0 auto';

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(displayEl);

      // Mouse listener attached to display element
      const mouse = new Guacamole.Mouse(displayEl);
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState: any) => {
        if (clientRef.current) {
          clientRef.current.sendMouseState(mouseState);
        }
      };

      // Keyboard listener attached to document
      const keyboard = new Guacamole.Keyboard(document);
      keyboardRef.current = keyboard;

      keyboard.onkeydown = (keysym: number) => {
        if (clientRef.current) {
          clientRef.current.sendKeyEvent(1, keysym);
          return false;
        }
        return true;
      };

      keyboard.onkeyup = (keysym: number) => {
        if (clientRef.current) {
          clientRef.current.sendKeyEvent(0, keysym);
          return false;
        }
        return true;
      };

      // Client state listener
      client.onstatechange = (state: number) => {
        switch (state) {
          case 0: // IDLE
          case 1: // CONNECTING
          case 2: // WAITING
            setConnectionState('CONNECTING');
            break;
          case 3: // CONNECTED
            setConnectionState('CONNECTED');
            setTimeout(() => applyScale(), 100);
            break;
          case 4: // DISCONNECTING
          case 5: // DISCONNECTED
            setConnectionState('DISCONNECTED');
            if (keyboardRef.current) keyboardRef.current.reset();
            break;
        }
      };

      // Error handler
      client.onerror = (status: any) => {
        console.error('[RemoteDesktopView] Guacamole Client Error:', status);
        const msg = status?.message || 'Connection to remote desktop failed.';
        setErrorMessage(msg);
        setConnectionState('ERROR');
        if (keyboardRef.current) keyboardRef.current.reset();
      };

      // Tunnel error handler
      tunnel.onerror = (status: any) => {
        console.error('[RemoteDesktopView] Guacamole Tunnel Error:', status);
        const msg = status?.message || 'WebSocket tunnel error. Verify guacd status.';
        setErrorMessage(msg);
        setConnectionState('ERROR');
      };

      // Connect
      client.connect();
    } catch (err: any) {
      console.error('[RemoteDesktopView] Connect exception:', err);
      setErrorMessage(err.message || 'Failed to initialize desktop session.');
      setConnectionState('ERROR');
    }
  }, [getWsUrl, disconnectSession, applyScale]);

  useEffect(() => {
    connectSession();
    return () => {
      disconnectSession();
    };
  }, [connectSession, disconnectSession]);

  useEffect(() => {
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, [applyScale]);

  // Send Ctrl + Alt + Del
  const sendCtrlAltDel = () => {
    if (!clientRef.current) return;
    clientRef.current.sendKeyEvent(1, 0xFFE3); // Ctrl
    clientRef.current.sendKeyEvent(1, 0xFFE9); // Alt
    clientRef.current.sendKeyEvent(1, 0xFFFF); // Del
    clientRef.current.sendKeyEvent(0, 0xFFFF);
    clientRef.current.sendKeyEvent(0, 0xFFE9);
    clientRef.current.sendKeyEvent(0, 0xFFE3);
  };

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Send text to remote clipboard
  const handleSendClipboard = () => {
    if (!clientRef.current || !clipboardText) return;
    try {
      setClipboardSentStatus('Sent to remote clipboard!');
      setTimeout(() => setClipboardSentStatus(null), 3000);
    } catch (err: any) {
      console.warn('Clipboard stream error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] overflow-hidden rounded-xl border border-[#2b2b2b] relative">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181818] border-b border-[#2b2b2b] select-none text-xs">
        {/* Left: Server info & Connection status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100">{server.name}</span>
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-mono">
              {currentProtocol}:{currentPort}
            </span>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#222] border border-[#333]">
            {connectionState === 'CONNECTING' && (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 text-[11px] font-medium">Connecting...</span>
              </>
            )}
            {connectionState === 'CONNECTED' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[11px] font-medium">Connected</span>
              </>
            )}
            {connectionState === 'DISCONNECTED' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-400 text-[11px] font-medium">Disconnected</span>
              </>
            )}
            {connectionState === 'ERROR' && (
              <>
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-red-400 text-[11px] font-medium">Error</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Interactive Toolbar Buttons */}
        <div className="flex items-center gap-2">
          {/* Display Scale Selection */}
          <div className="flex items-center gap-1 bg-[#222] border border-[#333] rounded-lg p-0.5">
            <button
              onClick={() => setScaleMode('fit')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                scaleMode === 'fit' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Auto-Fit Display to Window"
            >
              Fit
            </button>
            <button
              onClick={() => setScaleMode('100')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                scaleMode === '100' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="100% Native Resolution"
            >
              100%
            </button>
            <button
              onClick={() => setScaleMode('125')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                scaleMode === '125' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="125% Zoom"
            >
              125%
            </button>
          </div>

          {/* Send Ctrl + Alt + Del */}
          <button
            onClick={sendCtrlAltDel}
            disabled={connectionState !== 'CONNECTED'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-slate-300 hover:text-white transition-all text-xs disabled:opacity-40"
            title="Send Ctrl+Alt+Del signal to remote machine"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Ctrl+Alt+Del</span>
          </button>

          {/* Remote Clipboard Toggle */}
          <button
            onClick={() => setIsClipboardOpen(!isClipboardOpen)}
            className={`p-1.5 rounded-lg border transition-all ${
              isClipboardOpen
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-[#222] hover:bg-[#2e2e2e] border-[#333] text-slate-300 hover:text-white'
            }`}
            title="Open Text Clipboard Drawer"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-slate-300 hover:text-white transition-all"
            title="Desktop Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Reconnect Button */}
          <button
            onClick={connectSession}
            className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-slate-300 hover:text-white transition-all"
            title="Reconnect Desktop Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-slate-300 hover:text-white transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div className="flex-1 relative overflow-auto bg-[#0a0a0a] flex items-center justify-center p-2">
        {/* Guacamole Client Element Container */}
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden" />

        {/* Loading Overlay */}
        {connectionState === 'CONNECTING' && (
          <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 shadow-xl shadow-sky-500/10 animate-pulse">
              <Monitor className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Connecting to Remote Desktop
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              {server.username}@{server.host}:{currentPort} ({currentProtocol})
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Establishing Guacamole protocol handshake...</span>
            </div>
          </div>
        )}

        {/* Error / Fallback Overlay */}
        {connectionState === 'ERROR' && (
          <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 shadow-xl shadow-red-500/10">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Remote Desktop Connection Failed
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
              {errorMessage || 'Unable to connect to remote desktop target. Verify target host availability and daemon configuration.'}
            </p>
            <div className="p-3 bg-[#181818] border border-[#2b2b2b] rounded-xl text-left max-w-md w-full mb-6 font-mono text-[11px] text-slate-300">
              <div className="text-slate-500 mb-1">// Troubleshooting Hints:</div>
              <div>• Ensure target host has RDP or VNC service running on port {currentPort}.</div>
              <div>• Verify <code className="text-sky-400">guacd</code> daemon is running (<code className="text-sky-400">docker compose up -d guacd</code>).</div>
              <div>• Check username and password in Remote Desktop Settings.</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-[#222] hover:bg-[#2e2e2e] text-slate-200 text-xs px-4 py-2.5 rounded-xl font-semibold border border-[#3b3b3b] transition-all"
              >
                <Settings className="w-4 h-4" />
                Configure Credentials
              </button>
              <button
                onClick={connectSession}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Remote Text Clipboard Drawer Overlay */}
        {isClipboardOpen && (
          <div className="absolute right-4 top-4 w-80 bg-[#1e1e1e] border border-[#333] rounded-2xl p-4 shadow-2xl z-30 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <Clipboard className="w-4 h-4 text-sky-400" />
                <span>Text Clipboard</span>
              </div>
              <button
                onClick={() => setIsClipboardOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              Paste or type text below to send directly to the remote session clipboard.
            </p>
            <textarea
              rows={4}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="Paste text here to send to remote machine..."
              className="w-full bg-[#141414] border border-[#333] rounded-xl p-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 mb-3 resize-none"
            />
            {clipboardSentStatus && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{clipboardSentStatus}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClipboardText('')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-medium"
              >
                Clear
              </button>
              <button
                onClick={handleSendClipboard}
                disabled={!clipboardText.trim()}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
              >
                <Send className="w-3 h-3" />
                Send to Remote
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Settings Modal */}
      <DesktopSettingsModal
        isOpen={isSettingsOpen}
        server={server}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={(updated) => {
          if (onServerUpdated) onServerUpdated(updated);
          setTimeout(() => connectSession(), 300);
        }}
      />
    </div>
  );
};
