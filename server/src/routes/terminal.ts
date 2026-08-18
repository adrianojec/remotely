import { Client } from 'ssh2';
import { db, ServerRecord } from '../db/index.js';
import { getServerCredentials } from './servers.js';
import { buildSshConfig } from '../utils/ssh.js';

export function handleTerminalWebSocket(wsContext: any, reqUrl: string) {
  // Extract underlying raw WebSocket if using Hono WSContext
  const ws = wsContext.raw || wsContext;

  const url = new URL(reqUrl, 'http://localhost');
  const serverId = url.searchParams.get('serverId');
  const cols = parseInt(url.searchParams.get('cols') || '80', 10);
  const rows = parseInt(url.searchParams.get('rows') || '24', 10);

  console.log(`[WS Terminal] New connection request for serverId="${serverId}" (cols=${cols}, rows=${rows})`);

  const safeSend = (data: object | string) => {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (wsContext.send) {
        wsContext.send(payload);
      } else if (ws.send) {
        ws.send(payload);
      }
    } catch {
      // Ignore write errors if client disconnected
    }
  };

  const safeClose = () => {
    try {
      if (wsContext.close) wsContext.close();
      else if (ws.close) ws.close();
    } catch {
      // Ignore
    }
  };

  if (ws.on) {
    ws.on('error', (err: any) => {
      if (err.code !== 'ECONNRESET') {
        console.warn('[WS Socket Warning]:', err.message);
      }
    });
  }

  if (!serverId) {
    console.warn('[WS Terminal] Missing serverId param');
    safeSend({ type: 'error', data: 'Missing serverId parameter\r\n' });
    safeClose();
    return;
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(serverId) as ServerRecord | undefined;

  if (!server) {
    console.warn(`[WS Terminal] Server not found in database: id=${serverId}`);
    safeSend({ type: 'error', data: `Server not found: ${serverId}\r\n` });
    safeClose();
    return;
  }

  console.log(`[WS Terminal] Attempting SSH connection to ${server.name} (${server.username}@${server.host}:${server.port})...`);

  const creds = getServerCredentials(server);
  const config = buildSshConfig(creds);
  const sshClient = new Client();
  let stream: any = null;

  sshClient.on('ready', () => {
    console.log(`[WS Terminal] SSH Connection READY for ${server.name}`);
    safeSend({ type: 'status', data: `Connected to ${server.username}@${server.host}:${server.port}\r\n` });

    sshClient.shell({ term: 'xterm-256color', cols, rows }, (err, ptyStream) => {
      if (err) {
        console.error(`[WS Terminal] SSH PTY Shell Error: ${err.message}`);
        safeSend({ type: 'error', data: `SSH PTY Error: ${err.message}\r\n` });
        sshClient.end();
        return;
      }

      stream = ptyStream;

      stream.on('data', (data: Buffer) => {
        safeSend({ type: 'output', data: data.toString('utf8') });
      });

      stream.on('close', () => {
        console.log(`[WS Terminal] PTY stream closed for ${server.name}`);
        safeSend({ type: 'status', data: '\r\nSSH session closed.\r\n' });
        safeClose();
        sshClient.end();
      });
    });
  });

  sshClient.on('error', (err) => {
    console.error(`[WS Terminal] SSH Client Error for ${server.name}:`, err.message);
    safeSend({ type: 'error', data: `SSH Connection Error: ${err.message}\r\n` });
    safeClose();
  });

  if (ws.on) {
    ws.on('message', (message: any) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'input' && stream) {
          stream.write(msg.data);
        } else if (msg.type === 'resize' && stream) {
          stream.setWindow(msg.rows, msg.cols, 0, 0);
        }
      } catch {
        // Raw text input fallback
        if (stream) {
          stream.write(message.toString());
        }
      }
    });

    ws.on('close', () => {
      console.log(`[WS Terminal] Client disconnected WS for ${server.name}`);
      if (stream) {
        try {
          stream.end();
        } catch {
          // Ignore
        }
      }
      try {
        sshClient.end();
      } catch {
        // Ignore
      }
    });
  }

  safeSend({ type: 'status', data: `Connecting to ${server.name} (${server.host})...\r\n` });

  try {
    sshClient.connect(config);
  } catch (err: any) {
    console.error(`[WS Terminal] Connection init exception: ${err.message}`);
    safeSend({ type: 'error', data: `Connection failed: ${err.message}\r\n` });
    safeClose();
  }
}
