import React, { useState } from 'react';
import { ChevronRight, Home, Edit3, ArrowRight } from 'lucide-react';

interface SftpBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const SftpBreadcrumb: React.FC<SftpBreadcrumbProps> = ({ currentPath, onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputPath, setInputPath] = useState(currentPath);

  const segments = currentPath.split('/').filter(Boolean);

  const handleSegmentClick = (index: number) => {
    const targetPath = '/' + segments.slice(0, index + 1).join('/');
    onNavigate(targetPath);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      onNavigate(inputPath.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#212121] border border-slate-200 dark:border-[#333] rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 transition-colors duration-200">
      {isEditing ? (
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="/var/www/html"
            className="flex-1 bg-white dark:bg-[#181818] text-slate-900 dark:text-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-[#444] focus:outline-none focus:border-sky-500 font-mono text-xs"
            autoFocus
          />
          <button
            type="submit"
            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1"
          >
            <span>Go</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setInputPath(currentPath);
              setIsEditing(false);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-[#2a2a2a]"
            title="Root Directory (/)"
          >
            <Home className="w-3.5 h-3.5" />
          </button>

          {segments.map((seg, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <button
                onClick={() => handleSegmentClick(idx)}
                className={`truncate max-w-[150px] p-1 rounded hover:bg-slate-200 dark:hover:bg-[#2a2a2a] transition-colors font-mono ${
                  idx === segments.length - 1 ? 'font-semibold text-sky-600 dark:text-sky-400' : 'hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {seg}
              </button>
            </React.Fragment>
          ))}

          <button
            onClick={() => {
              setInputPath(currentPath);
              setIsEditing(true);
            }}
            className="ml-auto text-slate-400 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a2a2a] transition-colors"
            title="Edit path manually"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
