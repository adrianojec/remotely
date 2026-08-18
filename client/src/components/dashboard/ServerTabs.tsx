import React from 'react';
import { TabType } from '../../types';
import { Terminal, Box, FolderTree, Monitor } from 'lucide-react';

interface ServerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const ServerTabs: React.FC<ServerTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'terminal', label: 'Interactive Terminal', icon: <Terminal className="w-4 h-4" /> },
    { id: 'containers', label: 'Docker Containers', icon: <Box className="w-4 h-4" /> },
    { id: 'sftp', label: 'SFTP Explorer', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'desktop', label: 'Remote Desktop', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center justify-between border-b border-[#2b2b2b] px-6 bg-[#181818]">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all relative border-b-2 ${
                isActive
                  ? 'border-sky-500 text-sky-400 font-semibold bg-[#1e1e1e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
