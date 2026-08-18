import { Server, ServerGroup, DockerContainer, Pm2Process } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchGroups(): Promise<ServerGroup[]> {
  const res = await fetch(`${API_BASE}/groups`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch groups');
  }
  return data.groups;
}

export async function createGroup(name: string): Promise<ServerGroup> {
  const res = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create group');
  }
  return data.group;
}

export async function deleteGroup(id: string): Promise<{ deletedServersCount: number }> {
  const res = await fetch(`${API_BASE}/groups/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete group');
  }
  return { deletedServersCount: data.deletedServersCount || 0 };
}

export async function assignServerGroup(serverId: string, groupId: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/group`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to assign server group');
  }
}

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
  groupId?: string | null;
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

export async function updateServer(
  id: string,
  payload: {
    name: string;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'privateKey';
    credential?: string;
    groupId?: string | null;
  }
): Promise<Server> {
  const res = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update server');
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
