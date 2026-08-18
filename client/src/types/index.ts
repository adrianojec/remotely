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
  auth_type: 'password' | 'privateKey';
  group_id?: string | null;
  rdp_enabled?: number;
  rdp_protocol?: 'rdp' | 'vnc';
  rdp_port?: number;
  rdp_username?: string | null;
  rdp_domain?: string | null;
  rdp_security?: 'any' | 'nla' | 'rdp' | 'tls';
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

export type TabType = 'terminal' | 'containers' | 'sftp' | 'desktop';


