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
  desktop_protocol?: 'rdp' | 'vnc' | 'ssh' | null;
  desktop_port?: number | null;
  desktop_width?: number | null;
  desktop_height?: number | null;
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

