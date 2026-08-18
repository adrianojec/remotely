import React, { useState } from 'react';
import { Server, ServerGroup } from '../../types';
import {
  Server as ServerIcon,
  Plus,
  Search,
  Trash2,
  Key,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Folder,
  FolderPlus,
  FolderInput,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
} from 'lucide-react';
import { testStoredServer } from '../../services/api';

interface SidebarProps {
  servers: Server[];
  groups: ServerGroup[];
  activeServer: Server | null;
  onSelectServer: (server: Server) => void;
  onAddServerClick: (groupId?: string | null) => void;
  onAddGroupClick: () => void;
  onDeleteServer: (id: string) => void;
  onDeleteGroupClick: (group: ServerGroup) => void;
  onMoveServerClick: (server: Server) => void;
  onEditServerClick: (server: Server) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  servers,
  groups,
  activeServer,
  onSelectServer,
  onAddServerClick,
  onAddGroupClick,
  onDeleteServer,
  onDeleteGroupClick,
  onMoveServerClick,
  onEditServerClick,
}) => {
  const [search, setSearch] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, { online: boolean; msg: string }>>({});
  // Track expanded state for groups (group ID -> boolean) and 'ungrouped' section
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  const renderServerCard = (server: Server) => {
    const isActive = activeServer?.id === server.id;
    const status = statusMap[server.id];
    const isTesting = testingId === server.id;

    return (
      <div
        key={server.id}
        onClick={() => onSelectServer(server)}
        className={`group relative rounded-xl p-2.5 cursor-pointer transition-all border ${
          isActive
            ? 'bg-gradient-to-r from-sky-950/40 to-zinc-900 border-sky-500/40 text-white shadow-sm'
            : 'border-transparent hover:border-zinc-800 hover:bg-zinc-800/40 text-slate-300'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
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
        <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
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

          <div className="flex items-center gap-1">
            {/* Edit Server Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditServerClick(server);
              }}
              className="text-slate-500 hover:text-sky-400 transition-colors p-0.5 rounded"
              title="Edit Server Details & Group"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Move Server Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveServerClick(server);
              }}
              className="text-slate-500 hover:text-sky-400 transition-colors p-0.5 rounded"
              title="Move to group"
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>

            {/* Delete Server Button */}
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
      </div>
    );
  };

  const ungroupedServers = filteredServers.filter((s) => !s.group_id);

  return (
    <aside className="w-80 bg-[#181818] border-r border-[#2b2b2b] flex flex-col h-full z-10 select-none">
      {/* Header & Add Buttons */}
      <div className="p-3.5 border-b border-[#2b2b2b] flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5 min-w-0 truncate">
          <ServerIcon className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span className="truncate">Servers ({servers.length})</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddGroupClick}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg transition-all font-medium border border-zinc-700"
            title="Create Server Group"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Group</span>
          </button>
          <button
            onClick={() => onAddServerClick(null)}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] px-2.5 py-1.5 rounded-lg transition-all shadow-md shadow-sky-600/20 font-medium"
            title="Add New Server"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Server</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3.5 py-2.5 border-b border-[#2b2b2b]">
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

      {/* Group & Server Expansion Panels */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {groups.length === 0 && filteredServers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {search ? 'No matching servers.' : 'No servers added yet. Click "+ Server" or "+ Group" to get started.'}
          </div>
        ) : (
          <>
            {/* Server Groups Expansion Panels */}
            {groups.map((group) => {
              const groupServers = filteredServers.filter((s) => s.group_id === group.id);
              // Auto expand when search active, otherwise check expanded state
              const isExpanded = search.trim() !== '' ? true : !!expanded[group.id];

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-zinc-800/80 bg-[#1a1a1a] overflow-hidden transition-all"
                >
                  {/* Expansion Panel Header */}
                  <div
                    onClick={() => toggleExpand(group.id)}
                    className="flex items-center justify-between px-3 py-2 bg-[#212121] hover:bg-[#262626] cursor-pointer transition-colors group/header"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button className="text-slate-400 hover:text-slate-200">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-xs text-slate-200 truncate">
                        {group.name}
                      </span>
                      <span className="bg-zinc-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                        {groupServers.length}
                      </span>
                    </div>

                    {/* Group Header Actions */}
                    <div className="flex items-center gap-1 opacity-70 group-hover/header:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddServerClick(group.id);
                        }}
                        className="text-slate-400 hover:text-sky-400 hover:bg-zinc-800 p-1 rounded transition-colors"
                        title={`Add server inside "${group.name}"`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGroupClick(group);
                        }}
                        className="text-slate-400 hover:text-rose-400 hover:bg-zinc-800 p-1 rounded transition-colors"
                        title={`Delete group "${group.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expansion Panel Content */}
                  {isExpanded && (
                    <div className="p-1.5 space-y-1 bg-[#181818]/60 border-t border-zinc-800/40">
                      {groupServers.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-slate-500 italic">
                          No servers in this group. Click "+" to add one.
                        </div>
                      ) : (
                        groupServers.map(renderServerCard)
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped Servers Expansion Panel */}
            {(ungroupedServers.length > 0 || groups.length === 0) && (
              <div className="rounded-xl border border-zinc-800/80 bg-[#1a1a1a] overflow-hidden transition-all">
                <div
                  onClick={() => toggleExpand('ungrouped')}
                  className="flex items-center justify-between px-3 py-2 bg-[#212121] hover:bg-[#262626] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button className="text-slate-400 hover:text-slate-200">
                      {search.trim() !== '' || !!expanded['ungrouped'] ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-xs text-slate-300 truncate">
                      {groups.length > 0 ? 'Ungrouped Servers' : 'All Servers'}
                    </span>
                    <span className="bg-zinc-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                      {ungroupedServers.length}
                    </span>
                  </div>
                </div>

                {(search.trim() !== '' || !!expanded['ungrouped']) && (
                  <div className="p-1.5 space-y-1 bg-[#181818]/60 border-t border-zinc-800/40">
                    {ungroupedServers.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-slate-500 italic">
                        No ungrouped servers.
                      </div>
                    ) : (
                      ungroupedServers.map(renderServerCard)
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
