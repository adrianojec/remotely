import { Server, ServerGroup, DockerContainer } from '../types';

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
  desktopProtocol?: 'rdp' | 'vnc';
  desktopPort?: number;
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
    desktopProtocol?: 'rdp' | 'vnc';
    desktopPort?: number;
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

/* ==================== SFTP API Methods ==================== */

export async function fetchSftpDirectory(serverId: string, remotePath?: string): Promise<{ currentPath: string; items: import('../types').SftpItem[] }> {
  const url = remotePath ? `${API_BASE}/servers/${serverId}/sftp/list?path=${encodeURIComponent(remotePath)}` : `${API_BASE}/servers/${serverId}/sftp/list`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to list remote directory');
  }

  return { currentPath: data.currentPath, items: data.items };
}

export async function readSftpFile(serverId: string, filePath: string): Promise<{ content: string; size: number }> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/read?path=${encodeURIComponent(filePath)}`);

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to read file');
  }

  return { content: data.content, size: data.size };
}

export async function writeSftpFile(serverId: string, filePath: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to save file');
  }
}

export function getSftpDownloadUrl(serverId: string, filePath: string): string {
  return `${API_BASE}/servers/${serverId}/sftp/download?path=${encodeURIComponent(filePath)}`;
}

export async function uploadSftpFile(serverId: string, targetPath: string, file: File): Promise<void> {
  const formData = new FormData();
  
  formData.append('path', targetPath);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to upload file');
  }
}

export async function createSftpDirectory(serverId: string, dirPath: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create directory');
  }
}

export async function createSftpFile(serverId: string, filePath: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/touch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create file');
  }
}

export async function deleteSftpItem(serverId: string, itemPath: string, isDirectory: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: itemPath, isDirectory }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete item');
  }
}

export async function renameSftpItem(serverId: string, oldPath: string, newPath: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${serverId}/sftp/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath }),
  });

  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to rename item');
  }
}


