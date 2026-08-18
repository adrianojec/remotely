import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import { ServerGroup, Server } from '../../types';

interface DeleteGroupModalProps {
  isOpen: boolean;
  group: ServerGroup | null;
  containedServers: Server[];
  onClose: () => void;
  onConfirmDelete: (groupId: string) => Promise<void>;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  group,
  containedServers,
  onClose,
  onConfirmDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !group) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmDelete(group.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2b2b2b] flex items-center justify-between bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Delete Server Group</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to delete the group <strong className="text-white">"{group.name}"</strong>?
          </p>

          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warning: Cascading Delete
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              This action will permanently delete <strong className="text-rose-300">{containedServers.length} server(s)</strong> inside this group along with their connection details.
            </p>
            {containedServers.length > 0 && (
              <div className="pt-1.5 border-t border-rose-500/20 max-h-24 overflow-y-auto space-y-1">
                {containedServers.map((s) => (
                  <div key={s.id} className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                    <span className="truncate">• {s.name}</span>
                    <span className="text-slate-500 text-[10px] truncate ml-2">{s.host}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-rose-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Group & Servers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
