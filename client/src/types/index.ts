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


