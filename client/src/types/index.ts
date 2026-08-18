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

export interface Pm2Process {
  pid: number;
  name: string;
  pm_id: number;
  monit: {
    memory: number;
    cpu: number;
  };
  pm2_env: {
    status: string;
    pm_uptime: number;
    restart_time: number;
    node_version: string;
    script: string;
  };
}

export type TabType = 'terminal' | 'containers' | 'processes';
