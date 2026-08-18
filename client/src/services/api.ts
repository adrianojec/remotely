import { Server, DockerContainer, Pm2Process } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchServers(): Promise<Server[]> {
  const res = await fetch(`${API_BASE}/servers`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch servers');
  }
  return data.servers;
}

export async function testConnection(payload: {
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  credential: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/servers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function testStoredServer(serverId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/test`, {
    method: 'POST',
  });
  return res.json();
}

export async function addServer(payload: {
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  credential: string;
}): Promise<Server> {
  const res = await fetch(`${API_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create server');
  }
  return data.server;
}

export async function deleteServer(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete server');
  }
}

export async function fetchContainers(serverId: string): Promise<{
  installed: boolean;
  containers: DockerContainer[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/containers`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch containers');
  }
  return data;
}

export async function containerAction(
  serverId: string,
  containerId: string,
  action: 'start' | 'stop' | 'restart'
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerId, action }),
  });
  return res.json();
}

export async function fetchContainerLogs(serverId: string, containerId: string): Promise<{
  success: boolean;
  logs: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/logs?containerId=${encodeURIComponent(containerId)}`);
  return res.json();
}

export async function fetchPm2Processes(serverId: string): Promise<{
  installed: boolean;
  processes: Pm2Process[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/processes`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch PM2 processes');
  }
  return data;
}

export async function pm2Action(
  serverId: string,
  pmId: number | string,
  action: 'restart' | 'stop' | 'delete'
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pmId, action }),
  });
  return res.json();
}
