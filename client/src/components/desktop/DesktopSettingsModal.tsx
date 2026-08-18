import React, { useState, useEffect } from 'react';
import { Server } from '../../types';
import { updateDesktopConfig } from '../../services/api';
import { X, Monitor, Shield, Lock, Eye, EyeOff, Save } from 'lucide-react';

interface DesktopSettingsModalProps {
  isOpen: boolean;
  server: Server;
  onClose: () => void;
  onUpdated: (updatedServer: Server) => void;
}

export const DesktopSettingsModal: React.FC<DesktopSettingsModalProps> = ({
  isOpen,
  server,
  onClose,
  onUpdated,
}) => {
  const [protocol, setProtocol] = useState<'rdp' | 'vnc'>('rdp');
  const [port, setPort] = useState<number>(3389);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [domain, setDomain] = useState<string>('');
  const [security, setSecurity] = useState<'any' | 'nla' | 'rdp' | 'tls'>('any');
  const [ignoreCert, setIgnoreCert] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (server) {
      const proto = server.rdp_protocol || 'rdp';
      setProtocol(proto);
      setPort(server.rdp_port || (proto === 'vnc' ? 5900 : 3389));
      setUsername(server.rdp_username || '');
      setPassword('');
      setDomain(server.rdp_domain || '');
      setSecurity(server.rdp_security || 'any');
      setIgnoreCert(server.rdp_ignore_cert !== 0);
      setError(null);
    }
  }, [server, isOpen]);

  if (!isOpen) return null;

  const handleProtocolChange = (newProto: 'rdp' | 'vnc') => {
    setProtocol(newProto);
    if (port === 3389 || port === 5900) {
      setPort(newProto === 'vnc' ? 5900 : 3389);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updated = await updateDesktopConfig(server.id, {
        rdpProtocol: protocol,
        rdpPort: Number(port),
        rdpUsername: username.trim() || undefined,
        rdpPassword: password ? password : undefined,
        rdpDomain: domain.trim() || undefined,
        rdpSecurity: security,
        rdpIgnoreCert: ignoreCert,
      });

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update remote desktop settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2b2b] bg-[#181818]">
          <div className="flex items-center gap-2.5 text-slate-100 font-semibold text-sm">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Monitor className="w-4 h-4" />
            </div>
            <span>Remote Desktop Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Protocol Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Protocol</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProtocolChange('rdp')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  protocol === 'rdp'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-[#333] bg-[#242424] text-slate-400 hover:text-slate-200'
                }`}
              >
                RDP (Windows/Linux)
              </button>
              <button
                type="button"
                onClick={() => handleProtocolChange('vnc')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  protocol === 'vnc'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-[#333] bg-[#242424] text-slate-400 hover:text-slate-200'
                }`}
              >
                VNC (Desktop/Mac)
              </button>
            </div>
          </div>

          {/* Port */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Remote Desktop Port
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder={protocol === 'vnc' ? '5900' : '3389'}
              className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Desktop Username <span className="text-slate-500 font-normal">(optional, defaults to SSH user)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={server.username || 'Administrator'}
              className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Desktop Password <span className="text-slate-500 font-normal">(optional, leave blank to keep unchanged)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-slate-100 pr-10 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {protocol === 'rdp' && (
            <>
              {/* Domain */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Domain <span className="text-slate-500 font-normal">(optional Active Directory domain)</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="WORKGROUP or DOMAIN"
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* RDP Security Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  RDP Security Level
                </label>
                <select
                  value={security}
                  onChange={(e) => setSecurity(e.target.value as any)}
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="any">Any (Auto-Negotiate Security)</option>
                  <option value="nla">NLA (Network Level Authentication)</option>
                  <option value="tls">TLS Encryption</option>
                  <option value="rdp">Standard RDP Encryption</option>
                </select>
              </div>
            </>
          )}

          {/* Ignore SSL Cert Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ignoreCertCheck"
              checked={ignoreCert}
              onChange={(e) => setIgnoreCert(e.target.checked)}
              className="rounded border-[#333] bg-[#181818] text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            <label htmlFor="ignoreCertCheck" className="text-xs text-slate-300 select-none cursor-pointer">
              Ignore self-signed SSL/TLS certificates
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2b2b2b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : 'Save Desktop Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
