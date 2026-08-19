import React, { useEffect, useState } from 'react';
import { X, Save, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { readSftpFile, writeSftpFile } from '../../services/api';

interface SftpEditorModalProps {
  isOpen: boolean;
  serverId: string;
  filePath: string | null;
  onClose: () => void;
}

export const SftpEditorModal: React.FC<SftpEditorModalProps> = ({
  isOpen,
  serverId,
  filePath,
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serverId && filePath) {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      readSftpFile(serverId, filePath)
        .then((data) => {
          setContent(data.content);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load file content');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, serverId, filePath]);

  if (!isOpen || !filePath) return null;

  const fileName = filePath.split('/').pop() || filePath;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await writeSftpFile(serverId, filePath, content);
      setSuccessMessage('File saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const lineCount = content.split('\n').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#333] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2b2b2b] bg-slate-100 dark:bg-[#181818]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{fileName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{filePath}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-all shadow-md shadow-sky-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#2b2b2b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications Bar */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#141414]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600 dark:text-sky-400" />
              Loading file content over SFTP...
            </div>
          ) : (
            <div className="flex-1 flex overflow-auto font-mono text-xs text-slate-800 dark:text-slate-200">
              {/* Line Numbers */}
              <div className="py-4 px-3 bg-slate-200/60 dark:bg-[#181818] border-r border-slate-300 dark:border-[#2a2a2a] text-slate-400 dark:text-slate-600 text-right select-none min-w-[45px]">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                className="flex-1 p-4 bg-transparent text-slate-900 dark:text-slate-100 resize-none focus:outline-none leading-6 font-mono font-medium whitespace-pre"
              />
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="px-6 py-2 bg-slate-100 dark:bg-[#181818] border-t border-slate-200 dark:border-[#2b2b2b] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div>Lines: {lineCount}</div>
          <div className="font-mono">{filePath}</div>
        </div>
      </div>
    </div>
  );
};
