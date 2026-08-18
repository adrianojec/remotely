import React from 'react';
import { Server as ServerIcon, Terminal, Shield, RefreshCw } from 'lucide-react';
import { Server } from '../../types';

interface HeaderProps {
  activeServer: Server | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeServer, onRefresh, isRefreshing }) => {
  return (
    <header className="h-14 border-b border-[#2b2b2b] bg-[#181818] px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-lg shadow-sky-500/20">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Remotely
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            v1.0 MVP
          </span>
        </div>
      </div>

      {activeServer ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-mono">Active Host:</span>
            <span className="text-slate-200 font-semibold">{activeServer.name}</span>
            <span className="text-slate-500 font-mono text-[11px]">({activeServer.username}@{activeServer.host}:{activeServer.port})</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Refresh Host Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-slate-500" />
          <span>AES-256 Encrypted Credential Vault</span>
        </div>
      )}
    </header>
  );
};
