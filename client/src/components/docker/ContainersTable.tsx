import React, { useEffect, useState } from 'react';
import { Server, DockerContainer, DockerAction } from '../../types';
import { fetchContainers, containerAction } from '../../services/api';
import { ContainerLogsModal } from './ContainerLogsModal';
import { Box, Play, Square, RotateCw, FileText, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

interface ContainersTableProps {
  server: Server;
}

export const ContainersTable: React.FC<ContainersTableProps> = ({ server }) => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [installed, setInstalled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [selectedContainerLogs, setSelectedContainerLogs] = useState<{ id: string; name: string } | null>(null);

  const loadContainers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchContainers(server.id);
      setInstalled(res.installed);
      setContainers(res.containers);
      if (res.error) setError(res.error);
    } catch (err: any) {
      setError(err.message || 'Failed to connect or fetch container state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (server) {
      loadContainers();
    }
  }, [server.id]);

  const handleAction = async (containerId: string, action: DockerAction) => {
    setActionId(containerId);
    try {
      const res = await containerAction(server.id, containerId, action);
      if (res.success) {
        await loadContainers();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute container action');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <span className="text-xs">Querying Docker daemon on {server.name} over SSH...</span>
      </div>
    );
  }

  if (!installed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h4 className="font-bold text-amber-300 text-sm mb-1">Docker Not Detected</h4>
        <p className="text-xs text-amber-200/80 mb-4">
          {error || 'Docker engine or CLI is not installed on this host.'}
        </p>
        <button
          onClick={loadContainers}
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
          <Box className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-xs text-slate-200">
            Containers ({containers.length})
          </span>
        </div>
        <button
          onClick={loadContainers}
          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Containers Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#1f1f1f] border-b border-[#2b2b2b] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4">Name / ID</th>
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Ports</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {containers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 font-sans text-xs">
                  No Docker containers found on this server.
                </td>
              </tr>
            ) : (
              containers.map((c) => {
                const isRunning = c.State === 'running';
                const isActioning = actionId === c.ID;

                return (
                  <tr key={c.ID} className="hover:bg-slate-800/40 transition-colors">
                    {/* State badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isRunning
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        {c.State}
                      </span>
                    </td>

                    {/* Name / ID */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 font-sans">{c.Names}</div>
                      <div className="text-[10px] text-slate-500">{c.ID.substring(0, 12)}</div>
                    </td>

                    {/* Image */}
                    <td className="py-3 px-4 text-slate-300 text-[11px] truncate max-w-[200px]" title={c.Image}>
                      {c.Image}
                    </td>

                    {/* Ports */}
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[180px]" title={c.Ports}>
                      {c.Ports || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{c.Status}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isRunning ? (
                          <button
                            onClick={() => handleAction(c.ID, DockerAction.STOP)}
                            disabled={isActioning}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-colors"
                            title="Stop Container"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(c.ID, DockerAction.START)}
                            disabled={isActioning}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-900/40 text-slate-400 hover:text-emerald-300 border border-slate-700/50 transition-colors"
                            title="Start Container"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(c.ID, DockerAction.RESTART)}
                          disabled={isActioning}
                          className="p-1 rounded bg-zinc-800 hover:bg-sky-900/40 text-slate-400 hover:text-sky-300 border border-zinc-700/50 transition-colors"
                          title="Restart Container"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isActioning ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          onClick={() => setSelectedContainerLogs({ id: c.ID, name: c.Names })}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
                          title="View Logs"
                        >
                          <FileText className="w-3.5 h-3.5" />
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

      {/* Logs Modal */}
      {selectedContainerLogs && (
        <ContainerLogsModal
          isOpen={!!selectedContainerLogs}
          serverId={server.id}
          containerId={selectedContainerLogs.id}
          containerName={selectedContainerLogs.name}
          onClose={() => setSelectedContainerLogs(null)}
        />
      )}
    </div>
  );
};
