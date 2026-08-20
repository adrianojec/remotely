import { executeSshCommand, SshCredentials } from '../utils/ssh.js';

export interface CpuMetrics {
  usagePercent: number;
  cores: number;
  model: string;
  load1: number;
  load5: number;
  load15: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  cachedBytes: number;
  usedPercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
  swapUsedPercent: number;
}

export interface DiskPartition {
  filesystem: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  mountPoint: string;
}

export interface NetworkMetrics {
  rxBytes: number;
  txBytes: number;
  interfacesCount: number;
}

export interface ProcessInfo {
  pid: string;
  user: string;
  cpuPercent: number;
  memPercent: number;
  command: string;
}

export interface ServerSystemMetrics {
  osName: string;
  kernelVersion: string;
  uptime: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disks: DiskPartition[];
  network: NetworkMetrics;
  topProcesses: ProcessInfo[];
  timestamp: string;
}

export async function fetchServerMetrics(creds: SshCredentials): Promise<ServerSystemMetrics> {
  const command = [
    'LC_ALL=C',
    'echo "---OS---"; cat /etc/os-release 2>/dev/null || uname -sr',
    'echo "---UNAME---"; uname -r',
    'echo "---CPUINFO---"; grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 || echo "Generic CPU"',
    'echo "---NPROC---"; nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "1"',
    'echo "---UPTIME---"; uptime',
    'echo "---MEMINFO---"; cat /proc/meminfo 2>/dev/null',
    'echo "---DF---"; df -k -P',
    'echo "---NETDEV---"; cat /proc/net/dev 2>/dev/null',
    'echo "---TOPPS---"; ps aux --sort=-%cpu 2>/dev/null | head -n 20 || ps aux | head -n 20',
    'echo "---STAT1---"; cat /proc/stat | grep "^cpu "',
    'sleep 0.2',
    'echo "---STAT2---"; cat /proc/stat | grep "^cpu "'
  ].join('; ');

  const res = await executeSshCommand(creds, command);
  if (res.code !== 0 && !res.stdout) {
    throw new Error(res.stderr || 'Failed to retrieve metrics over SSH');
  }

  const output = res.stdout;
  const getSection = (marker: string): string => {
    const startPattern = `---${marker}---`;
    const startIndex = output.indexOf(startPattern);
    if (startIndex === -1) return '';
    const contentStart = startIndex + startPattern.length;
    const nextMarker = output.indexOf('---', contentStart);
    if (nextMarker === -1) return output.substring(contentStart).trim();
    return output.substring(contentStart, nextMarker).trim();
  };

  // 1. OS Name
  let osName = 'Linux';
  const osSection = getSection('OS');
  const prettyMatch = osSection.match(/PRETTY_NAME="?([^"\n]+)"?/);
  if (prettyMatch) {
    osName = prettyMatch[1];
  } else {
    const nameMatch = osSection.match(/NAME="?([^"\n]+)"?/);
    if (nameMatch) osName = nameMatch[1];
    else if (osSection) osName = osSection.split('\n')[0];
  }

  // 2. Kernel & CPU info
  const kernelVersion = getSection('UNAME') || 'Unknown';
  const cpuModel = getSection('CPUINFO').trim() || 'Generic CPU';
  const nprocStr = getSection('NPROC');
  const cores = parseInt(nprocStr, 10) || 1;

  // 3. Uptime & Load Averages
  const uptimeRaw = getSection('UPTIME');
  let uptime = 'Unknown';
  let load1 = 0, load5 = 0, load15 = 0;
  
  if (uptimeRaw) {
    const upMatch = uptimeRaw.match(/up\s+(.*?),\s+\d+\s+user/);
    if (upMatch) {
      uptime = upMatch[1];
    } else {
      const upMatchAlt = uptimeRaw.match(/up\s+(.*?)(,|\d+\s+user)/);
      if (upMatchAlt) uptime = upMatchAlt[1];
    }

    const loadMatch = uptimeRaw.match(/load average[s]?:?\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (loadMatch) {
      load1 = parseFloat(loadMatch[1]) || 0;
      load5 = parseFloat(loadMatch[2]) || 0;
      load15 = parseFloat(loadMatch[3]) || 0;
    }
  }

  // 4. Memory Metrics
  const memSection = getSection('MEMINFO');
  let totalBytes = 0, freeBytes = 0, availableBytes = 0, cachedBytes = 0, buffersBytes = 0;
  let swapTotalBytes = 0, swapFreeBytes = 0;

  memSection.split('\n').forEach((line) => {
    const parts = line.split(':');
    if (parts.length < 2) return;
    const key = parts[0].trim();
    const valKb = parseInt(parts[1].trim().split(/\s+/)[0], 10) || 0;
    const valBytes = valKb * 1024;

    if (key === 'MemTotal') totalBytes = valBytes;
    else if (key === 'MemFree') freeBytes = valBytes;
    else if (key === 'MemAvailable') availableBytes = valBytes;
    else if (key === 'Cached') cachedBytes = valBytes;
    else if (key === 'Buffers') buffersBytes = valBytes;
    else if (key === 'SwapTotal') swapTotalBytes = valBytes;
    else if (key === 'SwapFree') swapFreeBytes = valBytes;
  });

  if (availableBytes === 0) {
    availableBytes = freeBytes + cachedBytes + buffersBytes;
  }
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
  const swapUsedBytes = Math.max(0, swapTotalBytes - swapFreeBytes);
  const swapUsedPercent = swapTotalBytes > 0 ? Math.round((swapUsedBytes / swapTotalBytes) * 100) : 0;

  const memory: MemoryMetrics = {
    totalBytes,
    usedBytes,
    freeBytes,
    availableBytes,
    cachedBytes,
    usedPercent,
    swapTotalBytes,
    swapUsedBytes,
    swapUsedPercent,
  };

  // 5. Disk Partitions
  const dfSection = getSection('DF');
  const disks: DiskPartition[] = [];
  const dfLines = dfSection.split('\n').filter(Boolean);
  
  for (let i = 1; i < dfLines.length; i++) {
    const parts = dfLines[i].trim().split(/\s+/);
    if (parts.length >= 6) {
      const filesystem = parts[0];
      const totalK = parseInt(parts[1], 10) || 0;
      const usedK = parseInt(parts[2], 10) || 0;
      const availK = parseInt(parts[3], 10) || 0;
      const pctStr = parts[4].replace('%', '');
      const usedPercent = parseInt(pctStr, 10) || 0;
      const mountPoint = parts[5];

      // Exclude tmpfs, devtmpfs, loop devices unless root or user mount
      if (!filesystem.includes('tmpfs') && !filesystem.includes('/dev/loop') && !mountPoint.startsWith('/dev')) {
        disks.push({
          filesystem,
          totalBytes: totalK * 1024,
          usedBytes: usedK * 1024,
          availableBytes: availK * 1024,
          usedPercent,
          mountPoint,
        });
      }
    }
  }

  // 6. Network Metrics
  const netSection = getSection('NETDEV');
  let rxBytes = 0, txBytes = 0, interfacesCount = 0;
  netSection.split('\n').forEach((line) => {
    if (line.includes(':')) {
      const [iface, statsStr] = line.split(':');
      const ifaceName = iface.trim();
      if (ifaceName !== 'lo') {
        interfacesCount++;
        const stats = statsStr.trim().split(/\s+/);
        rxBytes += parseInt(stats[0], 10) || 0;
        txBytes += parseInt(stats[8], 10) || 0;
      }
    }
  });

  const network: NetworkMetrics = {
    rxBytes,
    txBytes,
    interfacesCount,
  };

  // 7. CPU Usage Delta calculation from STAT1 & STAT2
  const stat1 = getSection('STAT1');
  const stat2 = getSection('STAT2');
  let usagePercent = 0;

  const parseStatCpu = (statStr: string) => {
    const parts = statStr.trim().split(/\s+/).slice(1).map(Number);
    const idle = (parts[3] || 0) + (parts[4] || 0); // idle + iowait
    const total = parts.reduce((acc, curr) => acc + (curr || 0), 0);
    return { idle, total };
  };

  if (stat1 && stat2) {
    const cpu1 = parseStatCpu(stat1);
    const cpu2 = parseStatCpu(stat2);
    const totalDelta = cpu2.total - cpu1.total;
    const idleDelta = cpu2.idle - cpu1.idle;
    if (totalDelta > 0) {
      usagePercent = Math.min(100, Math.max(0, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)));
    }
  }

  const cpu: CpuMetrics = {
    usagePercent,
    cores,
    model: cpuModel,
    load1,
    load5,
    load15,
  };

  // 8. Top Processes
  const psSection = getSection('TOPPS');
  const topProcesses: ProcessInfo[] = [];
  const psLines = psSection.split('\n').filter(Boolean);
  
  for (let i = 1; i < psLines.length; i++) {
    const parts = psLines[i].trim().split(/\s+/);
    if (parts.length >= 11) {
      const user = parts[0];
      const pid = parts[1];
      const cpuPercent = parseFloat(parts[2]) || 0;
      const memPercent = parseFloat(parts[3]) || 0;
      const command = parts.slice(10).join(' ');

      // Filter out self-monitoring / ephemeral metric collection commands
      if (
        command.includes('ps aux') ||
        command.includes('head -n') ||
        command.includes('---TOPPS---')
      ) {
        continue;
      }

      topProcesses.push({
        pid,
        user,
        cpuPercent,
        memPercent,
        command,
      });
    }
  }

  return {
    osName,
    kernelVersion,
    uptime,
    cpu,
    memory,
    disks,
    network,
    topProcesses: topProcesses.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}
