import React from 'react';
import { TabType } from '../../types';
import { Activity, Terminal, Box, FolderTree, Monitor } from 'lucide-react';

interface ServerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const ServerTabs: React.FC<ServerTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: TabType.METRICS, label: 'System Metrics', icon: <Activity className="w-4 h-4" /> },
    { id: TabType.TERMINAL, label: 'Interactive Terminal', icon: <Terminal className="w-4 h-4" /> },
    { id: TabType.CONTAINERS, label: 'Docker Containers', icon: <Box className="w-4 h-4" /> },
    { id: TabType.SFTP, label: 'SFTP Explorer', icon: <FolderTree className="w-4 h-4" /> },
    { id: TabType.DESKTOP, label: 'Remote Desktop', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2b2b2b] px-6 bg-white dark:bg-[#181818] transition-colors duration-200">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all relative border-b-2 ${
                isActive
                  ? 'border-sky-600 dark:border-sky-500 text-sky-600 dark:text-sky-400 font-semibold bg-slate-50 dark:bg-[#1e1e1e]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

