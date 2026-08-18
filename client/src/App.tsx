import React, { useEffect, useState } from 'react';
import { Server, ServerGroup, TabType } from './types';
import { fetchServers, fetchGroups, deleteServer, deleteGroup } from './services/api';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { AddServerModal } from './components/server/AddServerModal';
import { EditServerModal } from './components/server/EditServerModal';
import { AddGroupModal } from './components/group/AddGroupModal';
import { DeleteGroupModal } from './components/group/DeleteGroupModal';
import { MoveServerModal } from './components/group/MoveServerModal';
import { ServerTabs } from './components/dashboard/ServerTabs';
import { TerminalView } from './components/terminal/TerminalView';
import { ContainersTable } from './components/docker/ContainersTable';
import { SftpExplorer } from './components/sftp/SftpExplorer';
import { Server as ServerIcon, Plus } from 'lucide-react';

export function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
  const [addServerDefaultGroupId, setAddServerDefaultGroupId] = useState<string | null>(null);
  const [serverToEdit, setServerToEdit] = useState<Server | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ServerGroup | null>(null);
  const [serverToMove, setServerToMove] = useState<Server | null>(null);

  const loadData = async () => {
    try {
      const [fetchedServers, fetchedGroups] = await Promise.all([
        fetchServers(),
        fetchGroups(),
      ]);
      setServers(fetchedServers);
      setGroups(fetchedGroups);

      if (fetchedServers.length > 0 && !activeServer) {
        setActiveServer(fetchedServers[0]);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddServer = (groupId: string | null = null) => {
    setAddServerDefaultGroupId(groupId);
    setIsAddServerModalOpen(true);
  };

  const handleServerAdded = (newServer: Server) => {
    setServers((prev) => [newServer, ...prev]);
    setActiveServer(newServer);
  };

  const handleGroupAdded = (newGroup: ServerGroup) => {
    setGroups((prev) => [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name)));
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

  const handleConfirmDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setServers((prev) => {
      const remaining = prev.filter((s) => s.group_id !== groupId);
      if (activeServer && activeServer.group_id === groupId) {
        setActiveServer(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
  };

  const handleServerMoved = (serverId: string, newGroupId: string | null) => {
    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, group_id: newGroupId } : s))
    );
    if (activeServer?.id === serverId) {
      setActiveServer((prev) => (prev ? { ...prev, group_id: newGroupId } : null));
    }
  };

  const handleServerUpdated = (updatedServer: Server) => {
    setServers((prev) =>
      prev.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
    if (activeServer?.id === updatedServer.id) {
      setActiveServer(updatedServer);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        activeServer={activeServer}
        onRefresh={loadData}
        isRefreshing={loading}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          servers={servers}
          groups={groups}
          activeServer={activeServer}
          onSelectServer={(s) => setActiveServer(s)}
          onAddServerClick={handleOpenAddServer}
          onAddGroupClick={() => setIsAddGroupModalOpen(true)}
          onDeleteServer={handleDeleteServer}
          onDeleteGroupClick={(g) => setGroupToDelete(g)}
          onMoveServerClick={(s) => setServerToMove(s)}
          onEditServerClick={(s) => setServerToEdit(s)}
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
                {activeTab === 'sftp' && (
                  <SftpExplorer key={activeServer.id} server={activeServer} />
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
                Connect your Linux infrastructure securely over SSH. Manage Docker containers and open interactive terminal sessions directly from your browser.
              </p>
              <button
                onClick={() => handleOpenAddServer(null)}
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
        isOpen={isAddServerModalOpen}
        groups={groups}
        defaultGroupId={addServerDefaultGroupId}
        onClose={() => setIsAddServerModalOpen(false)}
        onServerAdded={handleServerAdded}
      />

      {/* Add Group Modal */}
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onGroupAdded={handleGroupAdded}
      />

      {/* Delete Group Confirmation Modal */}
      <DeleteGroupModal
        isOpen={!!groupToDelete}
        group={groupToDelete}
        containedServers={servers.filter((s) => s.group_id === groupToDelete?.id)}
        onClose={() => setGroupToDelete(null)}
        onConfirmDelete={handleConfirmDeleteGroup}
      />

      {/* Move Server Modal */}
      <MoveServerModal
        isOpen={!!serverToMove}
        server={serverToMove}
        groups={groups}
        onClose={() => setServerToMove(null)}
        onServerMoved={handleServerMoved}
      />

      {/* Edit Server Modal */}
      <EditServerModal
        isOpen={!!serverToEdit}
        server={serverToEdit}
        groups={groups}
        onClose={() => setServerToEdit(null)}
        onServerUpdated={handleServerUpdated}
      />
    </div>
  );
}

export default App;
