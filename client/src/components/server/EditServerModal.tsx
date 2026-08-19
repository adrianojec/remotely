import React, { useState, useEffect } from 'react';
import { X, Server, Key, Lock, CheckCircle2, AlertTriangle, Loader2, Folder, Edit3 } from 'lucide-react';
import { updateServer, testConnection, testStoredServer } from '../../services/api';
import { Server as ServerType, ServerGroup, AuthType } from '../../types';
import { DEFAULT_SSH_PORT } from '../../constants';

interface EditServerModalProps {
  isOpen: boolean;
  server: ServerType | null;
  groups?: ServerGroup[];
  onClose: () => void;
  onServerUpdated: (server: ServerType) => void;
}

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  server,
  groups = [],
  onClose,
  onServerUpdated,
}) => {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(String(DEFAULT_SSH_PORT));
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>(AuthType.PASSWORD);
  const [credential, setCredential] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && server) {
      setName(server.name);
      setHost(server.host);
      setPort(String(server.port || DEFAULT_SSH_PORT));
      setUsername(server.username);
      setAuthType(server.auth_type);
      setCredential('');
      setGroupId(server.group_id || null);
      setTestResult(null);
      setError(null);
    }
  }, [isOpen, server]);

  if (!isOpen || !server) return null;

  const handleTest = async () => {
    if (!host || !username) {
      setError('Please fill in Host and Username before testing.');
      return;
    }

    setError(null);
    setTesting(true);
    setTestResult(null);

    try {
      if (credential && credential.trim() !== '') {
        const res = await testConnection({
          host,
          port: parseInt(port, 10) || DEFAULT_SSH_PORT,
          username,
          authType,
          credential,
        });
        setTestResult(res);
      } else {
        const res = await testStoredServer(server.id);
        setTestResult(res);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host || !username) {
      setError('Please complete all required fields.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateServer(server.id, {
        name,
        host,
        port: parseInt(port, 10) || DEFAULT_SSH_PORT,
        username,
        authType,
        credential: credential.trim() ? credential : undefined,
        groupId: groupId || null,
      });
      onServerUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2b2b2b] flex items-center justify-between bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Edit Server Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Selector & Server Display Name */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Server Display Name *</label>
              <input
                type="text"
                placeholder="e.g. Production Web-01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 flex items-center gap-1">
                <Folder className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                Group
              </label>
              <select
                value={groupId || ''}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">None (Ungrouped)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Host / IP Address *</label>
              <input
                type="text"
                placeholder="192.168.1.100 or app.domain.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">SSH Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Username & Auth Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">SSH Username *</label>
              <input
                type="text"
                placeholder="root"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Authentication Type</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAuthType(AuthType.PASSWORD)}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-all ${
                    authType === AuthType.PASSWORD
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3 h-3" /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType(AuthType.PRIVATE_KEY)}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-all ${
                    authType === AuthType.PRIVATE_KEY
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Key className="w-3 h-3" /> SSH Key
                </button>
              </div>
            </div>
          </div>

          {/* Credential input */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              {authType === AuthType.PASSWORD
                ? 'SSH Password (leave blank to keep existing)'
                : 'PEM Private Key Content (leave blank to keep existing)'}
            </label>
            {authType === AuthType.PASSWORD ? (
              <input
                type="password"
                placeholder="•••••••••••• (Unchanged)"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            ) : (
              <textarea
                rows={4}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----... (Unchanged)"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono text-[11px]"
              />
            )}
          </div>

          {/* Pre-flight test output */}
          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
              )}
              <span className="font-mono text-[11px]">{testResult.message}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#2b2b2b] flex items-center justify-between">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Pre-flight Test
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors shadow-lg shadow-sky-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
