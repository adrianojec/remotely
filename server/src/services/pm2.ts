import { executeSshCommand, SshCredentials } from '../utils/ssh.js';

export interface Pm2Process {
  pid: number;
  name: string;
  pm_id: number;
  monit: {
    memory: number;
    cpu: number;
  };
  pm2_env: {
    status: string; // online, stopped, errored
    pm_uptime: number;
    restart_time: number;
    node_version: string;
    script: string;
  };
}

export async function listPm2Processes(creds: SshCredentials): Promise<{ installed: boolean; processes: Pm2Process[]; error?: string }> {
  try {
    const res = await executeSshCommand(creds, `pm2 jlist`);

    if (res.code !== 0) {
      if (res.stderr.includes('command not found') || res.stderr.includes('pm2: not found')) {
        return { installed: false, processes: [], error: 'PM2 is not installed on this target host.' };
      }
      return { installed: true, processes: [], error: res.stderr.trim() || 'Failed to list PM2 processes' };
    }

    try {
      const parsed = JSON.parse(res.stdout.trim());
      if (Array.isArray(parsed)) {
        return { installed: true, processes: parsed };
      }
    } catch {
      // If parsing fails
    }

    return { installed: true, processes: [], error: 'Could not parse PM2 JSON output.' };
  } catch (err: any) {
    return { installed: false, processes: [], error: err.message || 'SSH execution error' };
  }
}

export async function handlePm2Action(creds: SshCredentials, pmId: number | string, action: 'restart' | 'stop' | 'delete'): Promise<{ success: boolean; message: string }> {
  const allowedActions = ['restart', 'stop', 'delete'];
  if (!allowedActions.includes(action)) {
    return { success: false, message: 'Invalid PM2 process action' };
  }

  try {
    const res = await executeSshCommand(creds, `pm2 ${action} ${pmId}`);
    if (res.code === 0) {
      return { success: true, message: `PM2 process ${pmId} ${action}ed successfully.` };
    }
    return { success: false, message: res.stderr.trim() || `Failed to ${action} PM2 process.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Execution error' };
  }
}
