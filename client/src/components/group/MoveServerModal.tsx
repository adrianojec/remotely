import React, { useState, useEffect } from 'react';
import { X, FolderInput, Loader2, Check } from 'lucide-react';
import { ServerGroup, Server } from '../../types';
import { assignServerGroup } from '../../services/api';

interface MoveServerModalProps {
  isOpen: boolean;
  server: Server | null;
  groups: ServerGroup[];
  onClose: () => void;
  onServerMoved: (serverId: string, newGroupId: string | null) => void;
}

export const MoveServerModal: React.FC<MoveServerModalProps> = ({
  isOpen,
  server,
  groups,
  onClose,
  onServerMoved,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (server) {
      setSelectedGroupId(server.group_id || null);
    }
  }, [server]);

  if (!isOpen || !server) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await assignServerGroup(server.id, selectedGroupId);
      onServerMoved(server.id, selectedGroupId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2b2b2b] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2b2b2b] flex items-center justify-between bg-slate-100 dark:bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Move Server to Group</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{server.name} ({server.host})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Select Target Group</label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {/* Option: Ungrouped */}
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-all ${
                  selectedGroupId === null
                    ? 'bg-sky-500/10 dark:bg-sky-950/40 border-sky-500/50 text-slate-900 dark:text-white font-medium shadow-sm'
                    : 'bg-slate-100 dark:bg-[#181818] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800/40'
                }`}
              >
                <span>None (Ungrouped)</span>
                {selectedGroupId === null && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
              </button>

              {/* Groups options */}
              {groups.map((g) => {
                const isSelected = selectedGroupId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-sky-500/10 dark:bg-sky-950/40 border-sky-500/50 text-slate-900 dark:text-white font-medium shadow-sm'
                        : 'bg-slate-100 dark:bg-[#181818] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <span>{g.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-sky-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
