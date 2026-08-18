import React, { useEffect, useState } from 'react';
import { Server, Pm2Process } from '../../types';
import { fetchPm2Processes, pm2Action } from '../../services/api';
import { Cpu, Play, Square, RotateCw, Trash2, AlertCircle, RefreshCw, Loader2, Activity } from 'lucide-react';

interface ProcessesTableProps {
  server: Server;
}

export const ProcessesTable: React.FC<ProcessesTableProps> = ({ server }) => {
  const [processes, setProcesses] = useState<Pm2Process[]>([]);
  const [installed, setInstalled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadProcesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPm2Processes(server.id);
      setInstalled(res.installed);
      setProcesses(res.processes);
      if (res.error) setError(res.error);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch PM2 process state over SSH.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (server) {
      loadProcesses();
    }
  }, [server.id]);

  const handleAction = async (pmId: number, action: 'restart' | 'stop' | 'delete') => {
    setActionId(pmId);
    try {
      const res = await pm2Action(server.id, pmId, action);
      if (res.success) {
        await loadProcesses();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute PM2 action');
    } finally {
      setActionId(null);
    }
  };

  const formatMemory = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <span className="text-xs">Querying PM2 runtime on {server.name} over SSH...</span>
      </div>
    );
  }

  if (!installed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h4 className="font-bold text-amber-300 text-sm mb-1">PM2 Not Installed</h4>
        <p className="text-xs text-amber-200/80 mb-4">
          {error || 'PM2 process manager was not found on this host system.'}
        </p>
        <button
          onClick={loadProcesses}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
        >
          Re-check Host
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#181818] border border-[#2b2b2b] rounded-xl overflow-hidden shadow-xl">
      {/* Table Subheader */}
      <div className="p-4 border-b border-[#2b2b2b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-xs text-slate-200">
            PM2 Applications ({processes.length})
          </span>
        </div>
        <button
          onClick={loadProcesses}
          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Processes Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#1f1f1f] border-b border-[#2b2b2b] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">PM ID / Name</th>
              <th className="py-3 px-4">PID</th>
              <th className="py-3 px-4">CPU</th>
              <th className="py-3 px-4">Memory</th>
              <th className="py-3 px-4">Restarts</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {processes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 font-sans text-xs">
                  No PM2 processes running on this host.
                </td>
              </tr>
            ) : (
              processes.map((p) => {
                const isOnline = p.pm2_env?.status === 'online';
                const isActioning = actionId === p.pm_id;

                return (
                  <tr key={p.pm_id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        {p.pm2_env?.status || 'unknown'}
                      </span>
                    </td>

                    {/* Name & PM ID */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 font-sans flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          #{p.pm_id}
                        </span>
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={p.pm2_env?.script}>
                        {p.pm2_env?.script || '—'}
                      </div>
                    </td>

                    {/* PID */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{p.pid || '—'}</td>

                    {/* CPU */}
                    <td className="py-3 px-4 text-slate-300 text-[11px]">
                      {p.monit?.cpu !== undefined ? `${p.monit.cpu}%` : '—'}
                    </td>

                    {/* Memory */}
                    <td className="py-3 px-4 text-slate-300 text-[11px]">
                      {formatMemory(p.monit?.memory)}
                    </td>

                    {/* Restarts */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {p.pm2_env?.restart_time ?? 0}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isOnline ? (
                          <button
                            onClick={() => handleAction(p.pm_id, 'stop')}
                            disabled={isActioning}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-colors"
                            title="Stop Process"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(p.pm_id, 'restart')}
                            disabled={isActioning}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-900/40 text-slate-400 hover:text-emerald-300 border border-slate-700/50 transition-colors"
                            title="Start Process"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(p.pm_id, 'restart')}
                          disabled={isActioning}
                          className="p-1 rounded bg-zinc-800 hover:bg-sky-900/40 text-slate-400 hover:text-sky-300 border border-zinc-700/50 transition-colors"
                          title="Restart Process"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isActioning ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete PM2 process #${p.pm_id} (${p.name})?`)) {
                              handleAction(p.pm_id, 'delete');
                            }
                          }}
                          disabled={isActioning}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-colors"
                          title="Delete Process"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
