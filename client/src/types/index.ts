import { AuthType, RdpProtocol, RdpSecurity, TabType } from './enums';

export * from './enums';

export interface ServerGroup {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: AuthType;
  group_id?: string | null;
  rdp_enabled?: number;
  rdp_protocol?: RdpProtocol;
  rdp_port?: number;
  rdp_username?: string | null;
  rdp_domain?: string | null;
  rdp_security?: RdpSecurity;
  rdp_ignore_cert?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Command: string;
  CreatedAt: string;
  RunningFor: string;
  Status: string;
  Ports: string;
  State: string;
}

export interface SftpItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  size: number;
  mode: number;
  modifiedAt: string;
}

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

export interface ServerMetrics {
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



