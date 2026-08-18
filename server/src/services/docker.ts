import { executeSshCommand, SshCredentials } from '../utils/ssh.js';
import { DockerAction } from '../db/enums.js';

export { DockerAction };


export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Command: string;
  CreatedAt: string;
  RunningFor: string;
  Status: string;
  Ports: string;
  State: string; // running, exited, etc.
}

export async function listDockerContainers(creds: SshCredentials): Promise<{ installed: boolean; containers: DockerContainer[]; error?: string }> {
  try {
    const res = await executeSshCommand(creds, `docker ps -a --format '{"ID":"{{.ID}}","Names":"{{.Names}}","Image":"{{.Image}}","Command":{{json .Command}},"CreatedAt":"{{.CreatedAt}}","RunningFor":"{{.RunningFor}}","Status":"{{.Status}}","Ports":"{{.Ports}}","State":"{{.State}}"}'`);
    
    if (res.code !== 0) {
      if (res.stderr.includes('command not found') || res.stderr.includes('docker: not found')) {
        return { installed: false, containers: [], error: 'Docker is not installed on this target host.' };
      }

      if (res.stderr.includes('Is the docker daemon running') || res.stderr.includes('permission denied')) {
        return { installed: true, containers: [], error: `Docker daemon issue: ${res.stderr.trim()}` };
      }

      return { installed: true, containers: [], error: res.stderr.trim() || 'Failed to list containers' };
    }

    const lines = res.stdout.trim().split('\n').filter(Boolean);
    const containers: DockerContainer[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        containers.push(parsed);
      } catch {
        // Ignore single malformed line
      }
    }

    return { installed: true, containers };
  } catch (err: any) {
    return { installed: false, containers: [], error: err.message || 'SSH execution error' };
  }
}

export async function handleDockerAction(creds: SshCredentials, containerId: string, action: DockerAction | string): Promise<{ success: boolean; message: string }> {
  const allowedActions = Object.values(DockerAction) as string[];

  if (!allowedActions.includes(action)) {
    return { success: false, message: 'Invalid container action' };
  }

  try {
    const res = await executeSshCommand(creds, `docker ${action} ${containerId}`);

    if (res.code === 0) {
      return { success: true, message: `Container ${containerId} ${action}ed successfully.` };
    }

    return { success: false, message: res.stderr.trim() || `Failed to ${action} container.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Execution error' };
  }
}

export async function fetchDockerLogs(creds: SshCredentials, containerId: string, tail: number = 100): Promise<{ success: boolean; logs: string; message?: string }> {
  try {
    const res = await executeSshCommand(creds, `docker logs --tail ${tail} ${containerId}`);

    const output = (res.stdout + '\n' + res.stderr).trim();
    
    return { success: true, logs: output || 'No logs found.' };
  } catch (err: any) {
    return { success: false, logs: '', message: err.message || 'Failed to fetch logs' };
  }
}
