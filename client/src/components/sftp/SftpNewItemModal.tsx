import React, { useState } from 'react';
import { X, FolderPlus, FilePlus, Loader2 } from 'lucide-react';
import { createSftpDirectory, createSftpFile } from '../../services/api';

interface SftpNewItemModalProps {
  isOpen: boolean;
  serverId: string;
  currentPath: string;
  onClose: () => void;
  onCreated: () => void;
}

export const SftpNewItemModal: React.FC<SftpNewItemModalProps> = ({
  isOpen,
  serverId,
  currentPath,
  onClose,
  onCreated,
}) => {
  const [type, setType] = useState<'file' | 'folder'>('file');
  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = itemName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const fullPath = currentPath.endsWith('/') ? `${currentPath}${trimmed}` : `${currentPath}/${trimmed}`;

    try {
      if (type === 'folder') {
        await createSftpDirectory(serverId, fullPath);
      } else {
        await createSftpFile(serverId, fullPath);
      }
      setItemName('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to create ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#2b2b2b]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {type === 'folder' ? <FolderPlus className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Create New Item</h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-[280px]">Location: {currentPath}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Item Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('file')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'file'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-[#333] bg-[#181818] text-slate-400 hover:text-slate-200'
                }`}
              >
                <FilePlus className="w-4 h-4" />
                New File
              </button>
              <button
                type="button"
                onClick={() => setType('folder')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'folder'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-[#333] bg-[#181818] text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {type === 'folder' ? 'Folder Name' : 'File Name'}
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={type === 'folder' ? 'my-new-folder' : 'app.config.json'}
              required
              className="w-full bg-[#141414] border border-[#333] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-[#2b2b2b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !itemName.trim()}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
