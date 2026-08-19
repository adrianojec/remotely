import React, { useEffect, useState, useRef } from 'react';
import { Server, SftpItem } from '../../types';
import {
  fetchSftpDirectory,
  getSftpDownloadUrl,
  uploadSftpFile,
  deleteSftpItem,
  renameSftpItem,
} from '../../services/api';
import { SftpBreadcrumb } from './SftpBreadcrumb';
import { SftpEditorModal } from './SftpEditorModal';
import { SftpNewItemModal } from './SftpNewItemModal';
import {
  Folder,
  File,
  FileText,
  FileCode,
  Link,
  Upload,
  Plus,
  RotateCw,
  CornerLeftUp,
  Download,
  Trash2,
  Edit2,
  FileEdit,
  Search,
  Loader2,
  AlertCircle,
  HardDrive,
} from 'lucide-react';

interface SftpExplorerProps {
  server: Server;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(item: SftpItem) {
  if (item.isDirectory) {
    return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/10" />;
  }
  if (item.isSymbolicLink) {
    return <Link className="w-4 h-4 text-purple-400" />;
  }
  const ext = item.name.split('.').pop()?.toLowerCase();
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'yml', 'yaml', 'sh', 'conf'].includes(ext || '')) {
    return <FileCode className="w-4 h-4 text-sky-400" />;
  }
  if (['txt', 'md', 'env', 'log'].includes(ext || '')) {
    return <FileText className="w-4 h-4 text-slate-300" />;
  }
  return <File className="w-4 h-4 text-slate-400" />;
}

export const SftpExplorer: React.FC<SftpExplorerProps> = ({ server }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<SftpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals
  const [editorFilePath, setEditorFilePath] = useState<string | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<SftpItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = async (targetPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSftpDirectory(server.id, targetPath);
      setCurrentPath(data.currentPath);
      setItems(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [server.id]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (!currentPath || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    loadDirectory(parentPath);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadSftpFile(server.id, currentPath, files[i]);
      }
      await loadDirectory(currentPath);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file(s)');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: SftpItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;

    try {
      await deleteSftpItem(server.id, item.path, item.isDirectory);
      setItems((prev) => prev.filter((i) => i.path !== item.path));
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleStartRename = (item: SftpItem) => {
    setRenamingItem(item);
    setRenameValue(item.name);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim() || renameValue === renamingItem.name) {
      setRenamingItem(null);
      return;
    }

    const parentDir = currentPath === '/' ? '/' : `${currentPath}/`;
    const newPath = `${parentDir}${renameValue.trim()}`;

    try {
      await renameSftpItem(server.id, renamingItem.path, newPath);
      setRenamingItem(null);
      await loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Failed to rename item');
    }
  };

  // Filter items
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] rounded-2xl border border-slate-200 dark:border-[#2b2b2b] overflow-hidden shadow-xl transition-colors duration-200">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-100 dark:bg-[#181818] border-b border-slate-200 dark:border-[#2b2b2b]">
        {/* Navigation Breadcrumb */}
        <div className="flex-1 min-w-[300px]">
          <SftpBreadcrumb currentPath={currentPath} onNavigate={handleNavigate} />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items..."
              className="bg-white dark:bg-[#212121] border border-slate-200 dark:border-[#333] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans w-36 sm:w-44"
            />
          </div>

          <button
            onClick={handleGoUp}
            disabled={!currentPath || currentPath === '/'}
            className="p-2 rounded-xl bg-white dark:bg-[#212121] hover:bg-slate-200 dark:hover:bg-[#2b2b2b] disabled:opacity-40 border border-slate-200 dark:border-[#333] text-slate-700 dark:text-slate-300 transition-colors"
            title="Go to parent directory"
          >
            <CornerLeftUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-[#212121] hover:bg-slate-200 dark:hover:bg-[#2b2b2b] disabled:opacity-40 border border-slate-200 dark:border-[#333] text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh Directory"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600 dark:text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="flex items-center gap-1.5 bg-white dark:bg-[#212121] hover:bg-slate-200 dark:hover:bg-[#2b2b2b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#333] text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>New</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all shadow-md shadow-sky-600/20"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Main Content Area / Drag Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 overflow-auto relative ${isDragOver ? 'bg-sky-500/10 border-2 border-dashed border-sky-400' : ''}`}
      >
        {/* Drag Overlay Banner */}
        {isDragOver && (
          <div className="absolute inset-0 z-40 bg-sky-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-sky-400 pointer-events-none">
            <Upload className="w-12 h-12 mb-3 animate-bounce" />
            <p className="text-sm font-semibold">Drop files here to upload over SFTP</p>
            <p className="text-xs text-sky-300/70 mt-1">Files will be saved directly into {currentPath}</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="m-4 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex items-center gap-3 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600 dark:text-sky-400" />
            <p className="text-xs font-medium">Fetching remote directory contents...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <HardDrive className="w-10 h-10 mb-3 text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Directory is empty</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Upload files or create items using the toolbar above.</p>
          </div>
        ) : (
          /* File List Table */
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2b2b2b] bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 font-medium sticky top-0 z-10">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#262626] font-mono text-slate-700 dark:text-slate-300">
              {filteredItems.map((item) => (
                <tr
                  key={item.path}
                  className="hover:bg-slate-50 dark:hover:bg-[#252525] transition-colors group"
                >
                  {/* Name Column */}
                  <td className="py-2.5 px-4 font-sans">
                    {renamingItem?.path === item.path ? (
                      <form onSubmit={handleConfirmRename} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="bg-slate-100 dark:bg-[#141414] border border-sky-500 rounded px-2 py-0.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                          autoFocus
                        />
                        <button type="submit" className="text-xs text-sky-600 dark:text-sky-400 hover:underline">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingItem(null)}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getFileIcon(item)}
                        {item.isDirectory ? (
                          <button
                            onClick={() => handleNavigate(item.path)}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate font-mono text-xs"
                          >
                            {item.name}
                          </button>
                        ) : (
                          <span className="truncate font-mono text-xs text-slate-800 dark:text-slate-200">{item.name}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Size Column */}
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {item.isDirectory ? '—' : formatBytes(item.size)}
                  </td>

                  {/* Modified Date Column */}
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {new Date(item.modifiedAt).toLocaleString()}
                  </td>

                  {/* Actions Column */}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!item.isDirectory && (
                        <>
                          {/* View / Edit Button */}
                          <button
                            onClick={() => setEditorFilePath(item.path)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                            title="View / Edit in browser"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Button */}
                          <a
                            href={getSftpDownloadUrl(server.id, item.path)}
                            download
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}

                      {/* Rename Button */}
                      <button
                        onClick={() => handleStartRename(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Modal */}
      <SftpEditorModal
        isOpen={!!editorFilePath}
        serverId={server.id}
        filePath={editorFilePath}
        onClose={() => setEditorFilePath(null)}
      />

      {/* New Item Modal */}
      <SftpNewItemModal
        isOpen={isNewItemModalOpen}
        serverId={server.id}
        currentPath={currentPath}
        onClose={() => setIsNewItemModalOpen(false)}
        onCreated={() => loadDirectory(currentPath)}
      />
    </div>
  );
};
