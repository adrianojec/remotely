import { Client, ConnectConfig } from 'ssh2';

export interface SshCredentials {
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  credential: string; // Plaintext password or private key
}

export function buildSshConfig(creds: SshCredentials): ConnectConfig {
  const config: ConnectConfig = {
    host: creds.host,
    port: creds.port,
    username: creds.username,
    readyTimeout: 10000,
  };

  if (creds.authType === 'password') {
    config.password = creds.credential;
  } else {
    config.privateKey = creds.credential;
  }

  return config;
}

export async function testSshConnection(creds: SshCredentials): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const conn = new Client();
    const config = buildSshConfig(creds);

    conn.on('ready', () => {
      conn.end();
      resolve({ success: true, message: 'SSH connection successful' });
    });

    conn.on('error', (err) => {
      conn.end();
      resolve({ success: false, message: err.message || 'Failed to connect' });
    });

    try {
      conn.connect(config);
    } catch (e: any) {
      resolve({ success: false, message: e.message || 'Connection initialization error' });
    }
  });
}

export async function executeSshCommand(creds: SshCredentials, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config = buildSshConfig(creds);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number) => {
          conn.end();
          resolve({ stdout, stderr, code: code || 0 });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString('utf8');
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString('utf8');
        });
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    conn.connect(config);
  });
}
