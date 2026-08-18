import net from 'node:net';
import { db, ServerRecord } from '../db/index.js';
import { getServerCredentials } from './servers.js';

function encodeGuacElement(val: string | number | undefined | null): string {
  const str = val !== undefined && val !== null ? String(val) : '';
  return `${Buffer.byteLength(str, 'utf8')}.${str}`;
}

function buildGuacInstruction(opcode: string, args: (string | number | undefined | null)[]): string {
  const elements = [encodeGuacElement(opcode), ...args.map(encodeGuacElement)];
  return elements.join(',') + ';';
}

export function handleDesktopWebSocket(wsContext: any, reqUrl: string) {
  const ws = wsContext.raw || wsContext;
  const url = new URL(reqUrl, 'http://localhost');
  const serverId = url.searchParams.get('serverId');

  const width = parseInt(url.searchParams.get('width') || '1920', 10);
  const height = parseInt(url.searchParams.get('height') || '1080', 10);
  const dpi = parseInt(url.searchParams.get('dpi') || '96', 10);

  const safeSend = (data: string) => {
    try {
      if (wsContext.send) {
        wsContext.send(data);
      } else if (ws.send) {
        ws.send(data);
      }
    } catch {
      // Ignore write errors
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
    safeSend(buildGuacInstruction('error', ['Missing serverId parameter', '512']));
    safeClose();
    return;
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(serverId) as ServerRecord | undefined;

  if (!server) {
    console.warn(`[WS Desktop] Server not found: id=${serverId}`);
    safeSend(buildGuacInstruction('error', [`Server not found: ${serverId}`, '512']));
    safeClose();
    return;
  }

  const creds = getServerCredentials(server);
  const protocol = server.desktop_protocol || 'rdp';
  const port = server.desktop_port || (protocol === 'vnc' ? 5900 : 3389);
  const targetWidth = server.desktop_width || width;
  const targetHeight = server.desktop_height || height;

  const guacdHost = process.env.GUACD_HOST || '127.0.0.1';
  const guacdPort = parseInt(process.env.GUACD_PORT || '4822', 10);

  console.log(`[WS Desktop] Connecting to guacd at ${guacdHost}:${guacdPort} for server ${server.name} (${protocol}://${server.host}:${port})...`);

  const guacSocket = new net.Socket();
  let handshaken = false;

  guacSocket.connect(guacdPort, guacdHost, () => {
    console.log(`[WS Desktop] Connected to guacd daemon. Initializing ${protocol} session...`);
    // Step 1: Select protocol instruction
    const selectInstruction = buildGuacInstruction('select', [protocol]);
    guacSocket.write(selectInstruction);
  });

  let receiveBuffer = '';

  guacSocket.on('data', (chunk: Buffer) => {
    if (!handshaken) {
      receiveBuffer += chunk.toString('utf8');

      // Wait for guacd args response (e.g. 4.args,...)
      const endIdx = receiveBuffer.indexOf(';');
      if (endIdx !== -1) {
        const firstInstruction = receiveBuffer.substring(0, endIdx + 1);
        receiveBuffer = receiveBuffer.substring(endIdx + 1);

        console.log(`[WS Desktop] guacd handshake response: ${firstInstruction}`);

        // Extract expected argument names from 4.args instruction
        // Example: 4.args,8.hostname,4.port,6.domain,8.username,8.password,...;
        const argParts = firstInstruction.slice(0, -1).split(',');
        const argNames: string[] = [];
        for (let i = 1; i < argParts.length; i++) {
          const dotIdx = argParts[i].indexOf('.');
          if (dotIdx !== -1) {
            argNames.push(argParts[i].substring(dotIdx + 1));
          }
        }

        // Build parameters map based on protocol
        const paramValues: Record<string, string> = {
          hostname: server.host,
          port: String(port),
          username: server.username,
          password: creds.credential || '',
          domain: '',
          security: 'nla', // Default Network Level Auth
          'ignore-cert': 'true',
          'enable-wallpaper': 'false',
          'enable-font-smoothing': 'true',
          'disable-audio': 'true',
          'resize-method': 'reconnect',
          width: String(targetWidth),
          height: String(targetHeight),
          dpi: String(dpi),
        };

        // Construct 4.size, 5.audio, 5.video, 5.image, 7.connect handshake instructions
        const sizeInstruction = buildGuacInstruction('size', [targetWidth, targetHeight, dpi]);
        const audioInstruction = buildGuacInstruction('audio', []);
        const videoInstruction = buildGuacInstruction('video', []);
        const imageInstruction = buildGuacInstruction('image', ['image/png', 'image/jpeg', 'image/webp']);

        // Match expected order from guacd args
        const connectArgs = argNames.map((name) => paramValues[name] || '');
        const connectInstruction = buildGuacInstruction('connect', connectArgs);

        guacSocket.write(sizeInstruction);
        guacSocket.write(audioInstruction);
        guacSocket.write(videoInstruction);
        guacSocket.write(imageInstruction);
        guacSocket.write(connectInstruction);

        handshaken = true;

        // Flush any remaining buffer to client
        if (receiveBuffer.length > 0) {
          safeSend(receiveBuffer);
          receiveBuffer = '';
        }
      }
    } else {
      // Forward stream to client
      safeSend(chunk.toString('utf8'));
    }
  });

  guacSocket.on('error', (err: any) => {
    console.error(`[WS Desktop] guacd socket error: ${err.message}`);
    safeSend(buildGuacInstruction('error', [`guacd connection error: ${err.message}. Is guacd container running on port 4822?`, '512']));
    safeClose();
  });

  guacSocket.on('close', () => {
    console.log(`[WS Desktop] guacd socket closed for server ${server.name}`);
    safeSend(buildGuacInstruction('disconnect', []));
    safeClose();
  });

  // Client -> Server (WS -> guacd)
  if (ws.on) {
    ws.on('message', (data: any) => {
      if (guacSocket.writable) {
        guacSocket.write(data.toString());
      }
    });

    ws.on('close', () => {
      console.log(`[WS Desktop] Client closed WebSocket for ${server.name}`);
      try {
        guacSocket.destroy();
      } catch {
        // Ignore
      }
    });
  }
}
