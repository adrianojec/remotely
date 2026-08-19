import React, { useEffect, useState, useRef } from 'react';
import { Server, ServerMetrics } from '../../types';
import { fetchServerMetrics } from '../../services/api';
import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Clock,
  Server as ServerIcon,
  Wifi,
  List,
  AlertTriangle,
  CheckCircle2,
  MemoryStick,
  Zap,
} from 'lucide-react';

interface MetricsDashboardViewProps {
  server: Server;
}

export const MetricsDashboardView: React.FC<MetricsDashboardViewProps> = ({ server }) => {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // Default 3s
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  const loadMetrics = async (showFullLoading = false) => {
    if (showFullLoading) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchServerMetrics(server.id);
      if (isMountedRef.current) {
        setMetrics(data);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to connect or fetch server metrics');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadMetrics(true);

    let intervalId: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        loadMetrics(false);
      }, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [server.id, refreshInterval]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (pct: number) => {
    if (pct < 60) return 'from-emerald-500 to-teal-600 text-emerald-500 border-emerald-500/30';
    if (pct < 85) return 'from-amber-500 to-orange-600 text-amber-500 border-amber-500/30';
    return 'from-rose-500 to-red-600 text-rose-500 border-rose-500/30';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct < 60) return 'bg-emerald-500';
    if (pct < 85) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (loading && !metrics) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
        <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Gathering Remote System Diagnostics...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Executing agentless SSH metrics query on <span className="font-mono text-sky-500">{server.host}</span>
        </p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-rose-500/20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/30 shadow-lg shadow-rose-500/10">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Unable to Fetch Metrics
        </h3>
        <p className="text-xs text-rose-500 dark:text-rose-400 max-w-md mb-6 leading-relaxed bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
          {error}
        </p>
        <button
          onClick={() => loadMetrics(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/30"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-1">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                System Diagnostics & Metrics
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live SSH
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Host: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{server.username}@{server.host}:{server.port}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#222] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#333]">
            <Clock className="w-3.5 h-3.5" />
            <span>Interval:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value={2000} className="dark:bg-[#1e1e1e]">2s</option>
              <option value={3000} className="dark:bg-[#1e1e1e]">3s</option>
              <option value={5000} className="dark:bg-[#1e1e1e]">5s</option>
              <option value={10000} className="dark:bg-[#1e1e1e]">10s</option>
              <option value={0} className="dark:bg-[#1e1e1e]">Paused</option>
            </select>
          </div>

          <button
            onClick={() => loadMetrics(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {metrics && (
        <>
          {/* OS System Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                <ServerIcon className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Operating System</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block" title={metrics.osName}>
                  {metrics.osName}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Uptime</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block" title={metrics.uptime}>
                  {metrics.uptime}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">CPU Hardware</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block" title={metrics.cpu.model}>
                  {metrics.cpu.cores} Core{metrics.cpu.cores > 1 ? 's' : ''} ({metrics.cpu.model.trim()})
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Kernel Release</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block" title={metrics.kernelVersion}>
                  {metrics.kernelVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Main Gauges & Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Utilization Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">CPU Usage</h3>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg border bg-opacity-10 ${getUsageColor(metrics.cpu.usagePercent)}`}>
                    {metrics.cpu.usagePercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#252525] h-3 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(metrics.cpu.usagePercent)}`}
                    style={{ width: `${metrics.cpu.usagePercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#252525]">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  Load Averages (1m, 5m, 15m):
                </span>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  <span className="bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">{metrics.cpu.load1}</span>
                  <span className="bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">{metrics.cpu.load5}</span>
                  <span className="bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">{metrics.cpu.load15}</span>
                </div>
              </div>
            </div>

            {/* RAM Memory Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-purple-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">RAM Memory</h3>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg border bg-opacity-10 ${getUsageColor(metrics.memory.usedPercent)}`}>
                    {metrics.memory.usedPercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#252525] h-3 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(metrics.memory.usedPercent)}`}
                    style={{ width: `${metrics.memory.usedPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#252525] text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytes(metrics.memory.usedBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytes(metrics.memory.totalBytes)}</span>
                </div>
              </div>
            </div>

            {/* Swap Memory Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Swap Space</h3>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg border bg-opacity-10 ${getUsageColor(metrics.memory.swapUsedPercent)}`}>
                    {metrics.memory.swapUsedPercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#252525] h-3 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(metrics.memory.swapUsedPercent)}`}
                    style={{ width: `${metrics.memory.swapUsedPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#252525] text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Used Swap:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytes(metrics.memory.swapUsedBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Swap:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytes(metrics.memory.swapTotalBytes)}</span>
                </div>
              </div>
            </div>

            {/* Network Traffic Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Network I/O</h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {metrics.network.interfacesCount} Interface{metrics.network.interfacesCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#222] border border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total RX:
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    {formatBytes(metrics.network.rxBytes)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#222] border border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span> Total TX:
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    {formatBytes(metrics.network.txBytes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Disk Partitions Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-sky-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Disk Storage Partitions</h3>
            </div>

            {metrics.disks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No storage partitions reported.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.disks.map((disk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#222] border border-slate-100 dark:border-[#2b2b2b]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                          {disk.mountPoint}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">({disk.filesystem})</span>
                      </div>
                      <span className={`text-xs font-bold ${disk.usedPercent > 85 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {disk.usedPercent}% Used
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-[#333] h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(disk.usedPercent)}`}
                        style={{ width: `${disk.usedPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Available: {formatBytes(disk.availableBytes)}</span>
                      <span>Total: {formatBytes(disk.totalBytes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Resource Consuming Processes */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-purple-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Top Resource Processes</h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Sorted by CPU %</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2b2b2b] text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-2">PID</th>
                    <th className="pb-2">USER</th>
                    <th className="pb-2">% CPU</th>
                    <th className="pb-2">% MEM</th>
                    <th className="pb-2">COMMAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#252525]">
                  {metrics.topProcesses.map((proc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#222] transition-colors">
                      <td className="py-2.5 font-mono text-slate-500 font-semibold">{proc.pid}</td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">{proc.user}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${proc.cpuPercent > 50 ? 'bg-rose-500/10 text-rose-500' : 'text-emerald-500'}`}>
                          {proc.cpuPercent}%
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-mono text-slate-600 dark:text-slate-300">{proc.memPercent}%</span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-md" title={proc.command}>
                        {proc.command}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
