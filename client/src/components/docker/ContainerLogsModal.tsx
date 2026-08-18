import React, { useEffect, useState } from 'react';
import { X, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { fetchContainerLogs } from '../../services/api';

interface ContainerLogsModalProps {
  isOpen: boolean;
  serverId: string;
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({
  isOpen,
  serverId,
  containerId,
  containerName,
  onClose,
}) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchContainerLogs(serverId, containerId);
      if (res.success) {
        setLogs(res.logs);
      } else {
        setError(res.message || 'Failed to fetch container logs.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && serverId && containerId) {
      loadLogs();
    }
  }, [isOpen, serverId, containerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181818] border border-[#2b2b2b] rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2b2b2b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Logs: <span className="font-mono text-sky-300">{containerName}</span> ({containerId.substring(0, 12)})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 rounded-lg bg-zinc-800 text-slate-300 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 text-xs flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-xs overflow-y-auto text-slate-300 whitespace-pre-wrap select-text">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span>Fetching latest 100 log lines over SSH...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              {error}
            </div>
          ) : (
            logs
          )}
        </div>
      </div>
    </div>
  );
};
