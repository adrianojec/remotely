import { db, ServerRecord, AuthType, RdpProtocol, RdpSecurity } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { connectGuacd, encodeGuacInstruction } from '../services/guacd.js';

export function handleDesktopWebSocket(wsContext: any, reqUrl: string) {
  const ws = wsContext.raw || wsContext;
  const url = new URL(reqUrl, 'http://localhost');
  const serverId = url.searchParams.get('serverId');
  const width = parseInt(url.searchParams.get('width') || '1280', 10);
  const height = parseInt(url.searchParams.get('height') || '720', 10);
  const dpi = parseInt(url.searchParams.get('dpi') || '96', 10);

  const safeSend = (opcode: string, ...args: string[]) => {
    try {
      const msg = encodeGuacInstruction(opcode, ...args);

      if (wsContext.send) wsContext.send(msg);
      else if (ws.send) ws.send(msg);
    } catch {
      // Ignore
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

  if (!serverId) {
    console.warn('[WS Desktop] Missing serverId parameter');

    safeSend('error', 'Missing serverId parameter', '512');
    safeClose();

    return;
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(serverId) as ServerRecord | undefined;

  if (!server) {
    console.warn(`[WS Desktop] Server not found in database: id=${serverId}`);

    safeSend('error', `Server not found: ${serverId}`, '512');
    safeClose();
    
    return;
  }

  const protocol = server.rdp_protocol || RdpProtocol.RDP;
  const defaultPort = protocol === RdpProtocol.VNC ? 5900 : 3389;
  const port = server.rdp_port || defaultPort;

  // Resolve username
  const username = server.rdp_username || server.username;

  // Resolve password
  let password = '';
  
  if (server.rdp_password_encrypted) {
    try {
      password = decrypt(server.rdp_password_encrypted);
    } catch (err: any) {
      console.warn(`[WS Desktop] Failed to decrypt rdp_password for ${server.name}: ${err.message}`);
    }
  } else if (server.auth_type === AuthType.PASSWORD && server.credential_encrypted) {
    try {
      password = decrypt(server.credential_encrypted);
    } catch (err: any) {
      console.warn(`[WS Desktop] Failed to decrypt SSH password fallback for ${server.name}: ${err.message}`);
    }
  }

  console.log(`[WS Desktop] Starting ${protocol.toUpperCase()} session for server "${server.name}" (${username}@${server.host}:${port})...`);

  connectGuacd(
    {
      protocol,
      hostname: server.host,
      port,
      username,
      password,
      domain: server.rdp_domain || undefined,
      security: server.rdp_security || RdpSecurity.ANY,
      ignoreCert: server.rdp_ignore_cert !== 0,
      width,
      height,
      dpi,
    },
    wsContext,
    reqUrl
  );
}
