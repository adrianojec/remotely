import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, RefreshCw, Sun, Moon, Monitor, Check } from 'lucide-react';
import { Server, ThemeMode } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  activeServer: Server | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeServer, onRefresh, isRefreshing }) => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-[#2b2b2b] bg-white dark:bg-[#181818] px-6 flex items-center justify-between z-20 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-lg shadow-sky-500/20">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Remotely
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium">
            v1.0 MVP
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {activeServer ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 px-3 py-1.5 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">Active Host:</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{activeServer.name}</span>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">({activeServer.username}@{activeServer.host}:{activeServer.port})</span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                title="Refresh Host Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>AES-256 Encrypted Credential Vault</span>
          </div>
        )}

        {/* Theme Selector Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
            title="Switch Theme"
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span className="capitalize text-[11px] hidden sm:inline">
              {themeMode}
            </span>
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-30 text-xs text-slate-700 dark:text-slate-200">
              <button
                onClick={() => {
                  setThemeMode(ThemeMode.LIGHT);
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  themeMode === ThemeMode.LIGHT ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </div>
                {themeMode === ThemeMode.LIGHT && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  setThemeMode(ThemeMode.DARK);
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  themeMode === ThemeMode.DARK ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark</span>
                </div>
                {themeMode === ThemeMode.DARK && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  setThemeMode(ThemeMode.SYSTEM);
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  themeMode === ThemeMode.SYSTEM ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  <span>System</span>
                </div>
                {themeMode === ThemeMode.SYSTEM && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

