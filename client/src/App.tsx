import React, { useEffect, useState } from 'react';
import { Server, TabType } from './types';
import { fetchServers, deleteServer } from './services/api';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { AddServerModal } from './components/server/AddServerModal';
import { ServerTabs } from './components/dashboard/ServerTabs';
import { TerminalView } from './components/terminal/TerminalView';
import { ContainersTable } from './components/docker/ContainersTable';
import { ProcessesTable } from './components/processes/ProcessesTable';
import { Server as ServerIcon, Plus, ShieldCheck, Terminal, Cpu } from 'lucide-react';

export function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadServers = async () => {
    try {
      const data = await fetchServers();
      setServers(data);
      if (data.length > 0 && !activeServer) {
        setActiveServer(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch server list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleServerAdded = (newServer: Server) => {
    setServers((prev) => [newServer, ...prev]);
    setActiveServer(newServer);
  };

  const handleDeleteServer = async (id: string) => {
    try {
      await deleteServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      if (activeServer?.id === id) {
        const remaining = servers.filter((s) => s.id !== id);
        setActiveServer(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete server');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        activeServer={activeServer}
        onRefresh={loadServers}
        isRefreshing={loading}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          servers={servers}
          activeServer={activeServer}
          onSelectServer={(s) => setActiveServer(s)}
          onAddServerClick={() => setIsAddModalOpen(true)}
          onDeleteServer={handleDeleteServer}
        />

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e] relative">
          {activeServer ? (
            <>
              {/* Tab Navigation */}
              <ServerTabs activeTab={activeTab} onTabChange={(t) => setActiveTab(t)} />

              {/* View Content */}
              <div className="flex-1 p-6 overflow-hidden">
                {activeTab === 'terminal' && (
                  <TerminalView key={activeServer.id} server={activeServer} />
                )}
                {activeTab === 'containers' && (
                  <ContainersTable key={activeServer.id} server={activeServer} />
                )}
                {activeTab === 'processes' && (
                  <ProcessesTable key={activeServer.id} server={activeServer} />
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 shadow-xl shadow-sky-500/10">
                <ServerIcon className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">No Remote Server Selected</h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Connect your Linux infrastructure securely over SSH. Manage containers, Node/PM2 processes, and open interactive terminal sessions directly from your browser.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/30"
              >
                <Plus className="w-4 h-4" />
                Add Your First Server
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Add Server Modal */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServerAdded={handleServerAdded}
      />
    </div>
  );
}

export default App;
