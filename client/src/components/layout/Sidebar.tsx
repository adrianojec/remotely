import React, { useState } from 'react';
import { Server } from '../../types';
import { Server as ServerIcon, Plus, Search, Trash2, Key, Lock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { testStoredServer } from '../../services/api';

interface SidebarProps {
  servers: Server[];
  activeServer: Server | null;
  onSelectServer: (server: Server) => void;
  onAddServerClick: () => void;
  onDeleteServer: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  servers,
  activeServer,
  onSelectServer,
  onAddServerClick,
  onDeleteServer,
}) => {
  const [search, setSearch] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, { online: boolean; msg: string }>>({});

  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.host.toLowerCase().includes(search.toLowerCase())
  );

  const handleTestConnection = async (e: React.MouseEvent, serverId: string) => {
    e.stopPropagation();
    setTestingId(serverId);
    try {
      const res = await testStoredServer(serverId);
      setStatusMap((prev) => ({
        ...prev,
        [serverId]: { online: res.success, msg: res.message },
      }));
    } catch {
      setStatusMap((prev) => ({
        ...prev,
        [serverId]: { online: false, msg: 'Test failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <aside className="w-72 bg-[#181818] border-r border-[#2b2b2b] flex flex-col h-full z-10 select-none">
      {/* Header & Add Button */}
      <div className="p-4 border-b border-[#2b2b2b] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ServerIcon className="w-4 h-4 text-sky-400" />
          Servers ({servers.length})
        </span>
        <button
          onClick={onAddServerClick}
          className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all shadow-md shadow-sky-600/20 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Server
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-[#2b2b2b]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search host or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1f1f1f] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredServers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {search ? 'No matching servers.' : 'No servers added yet. Click "Add Server" to get started.'}
          </div>
        ) : (
          filteredServers.map((server) => {
            const isActive = activeServer?.id === server.id;
            const status = statusMap[server.id];
            const isTesting = testingId === server.id;

            return (
              <div
                key={server.id}
                onClick={() => onSelectServer(server)}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-950/40 to-zinc-900 border-sky-500/40 text-white shadow-sm'
                    : 'border-transparent hover:border-zinc-800 hover:bg-zinc-800/40 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        status
                          ? status.online
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                            : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                          : 'bg-slate-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-medium text-xs text-slate-100 truncate">{server.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {server.username}@{server.host}:{server.port}
                      </div>
                    </div>
                  </div>

                  {/* Auth badge */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    {server.auth_type === 'privateKey' ? (
                      <span title="SSH Key Auth">
                        <Key className="w-3 h-3 text-amber-400/80" />
                      </span>
                    ) : (
                      <span title="Password Auth">
                        <Lock className="w-3 h-3 text-sky-400/80" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleTestConnection(e, server.id)}
                    disabled={isTesting}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono hover:underline disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                        Testing...
                      </>
                    ) : status ? (
                      status.online ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Online
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-400" />
                          Offline
                        </>
                      )
                    ) : (
                      'Pre-flight test'
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete server "${server.name}"?`)) {
                        onDeleteServer(server.id);
                      }
                    }}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 rounded"
                    title="Delete Server"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
