import net from 'node:net';
import { RdpProtocol, RdpSecurity } from '../db/index.js';

export interface GuacConnectionOptions {
  protocol: RdpProtocol;
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  domain?: string;
  security?: RdpSecurity | string;
  ignoreCert?: boolean;
  width?: number;
  height?: number;
  dpi?: number;
}

/**
 * Encodes opcode and arguments into a Guacamole instruction string.
 * Example: encodeGuacInstruction('select', 'rdp') => "6.select,3.rdp;"
 */
export function encodeGuacInstruction(opcode: string, ...args: (string | number | undefined | null)[]): string {
  const elements = [opcode, ...args.map((a) => (a !== undefined && a !== null ? String(a) : ''))];
  const encoded = elements.map((el) => `${Buffer.byteLength(el, 'utf8')}.${el}`).join(',');
  return `${encoded};`;
}

export interface GuacInstruction {
  opcode: string;
  args: string[];
}

/**
 * Strict length-based Guacamole instruction parser.
 * Reads exact element character lengths (e.g. 6.select,3.rdp;).
 * Correctly handles commas and semicolons inside binary/image payload data.
 */
export function parseGuacInstructions(dataString: string): { instructions: GuacInstruction[]; rawInstructions: string[]; remainder: string } {
  const instructions: GuacInstruction[] = [];
  const rawInstructions: string[] = [];
  let pos = 0;
  const len = dataString.length;

  while (pos < len) {
    let currentPos = pos;
    const elements: string[] = [];
    let instructionComplete = false;

    while (currentPos < len) {
      // Find dot separator for element length
      const dotIndex = dataString.indexOf('.', currentPos);
      if (dotIndex === -1) {
        // Not enough data for length prefix
        break;
      }

      const lengthStr = dataString.substring(currentPos, dotIndex);
      const elementLen = parseInt(lengthStr, 10);

      if (isNaN(elementLen) || elementLen < 0) {
        // Invalid protocol format, skip to next character
        pos++;
        break;
      }

      const valueStart = dotIndex + 1;
      const valueEnd = valueStart + elementLen;

      if (valueEnd > len) {
        // Incomplete element payload, wait for next TCP chunk
        break;
      }

      const elementVal = dataString.substring(valueStart, valueEnd);
      elements.push(elementVal);

      const terminator = dataString.charAt(valueEnd);
      currentPos = valueEnd + 1;

      if (terminator === ';') {
        instructionComplete = true;
        break;
      } else if (terminator === ',') {
        // Next element in current instruction
        continue;
      } else {
        // Unexpected terminator character, corrupt stream recovery
        break;
      }
    }

    if (instructionComplete && elements.length > 0) {
      const rawInst = dataString.substring(pos, currentPos);
      rawInstructions.push(rawInst);
      instructions.push({
        opcode: elements[0],
        args: elements.slice(1),
      });
      pos = currentPos;
    } else {
      // Waiting for remaining bytes of partial instruction
      break;
    }
  }

  return {
    instructions,
    rawInstructions,
    remainder: dataString.substring(pos),
  };
}

/**
 * Connects to guacd TCP daemon and completes Guacamole handshake for RDP/VNC.
 */
export function connectGuacd(
  options: GuacConnectionOptions,
  wsContext: any,
  reqUrl: string
) {
  const ws = wsContext.raw || wsContext;
  const guacdHost = process.env.GUACD_HOST || '127.0.0.1';
  const guacdPort = Number(process.env.GUACD_PORT) || 4822;

  const width = options.width || 1280;
  const height = options.height || 720;
  const dpi = options.dpi || 96;

  console.log(`[guacd] Connecting to guacd at ${guacdHost}:${guacdPort} for ${options.protocol.toUpperCase()} target ${options.hostname}:${options.port}...`);

  const safeSendWS = (data: string) => {
    try {
      if (wsContext.send) wsContext.send(data);
      else if (ws.send) ws.send(data);
    } catch {
      // WS client disconnected
    }
  };

  const safeCloseWS = () => {
    try {
      if (wsContext.close) wsContext.close();
      else if (ws.close) ws.close();
    } catch {
      // ignore
    }
  };

  const socket = new net.Socket();
  let handshakePhase: 'SELECT' | 'WAIT_ARGS' | 'READY' | 'CONNECTED' = 'SELECT';
  let bufferRemainder = '';

  socket.connect(guacdPort, guacdHost, () => {
    console.log(`[guacd] TCP connection established to ${guacdHost}:${guacdPort}`);
    // Step 1: Send select protocol
    const selectMsg = encodeGuacInstruction('select', options.protocol);
    socket.write(selectMsg);
    handshakePhase = 'WAIT_ARGS';
  });

  socket.on('data', (chunk: Buffer) => {
    bufferRemainder += chunk.toString('utf8');

    const { instructions, rawInstructions, remainder } = parseGuacInstructions(bufferRemainder);
    bufferRemainder = remainder;

    if (handshakePhase === 'CONNECTED') {
      // Send complete, well-formed Guacamole instructions to WebSocket
      if (rawInstructions.length > 0) {
        safeSendWS(rawInstructions.join(''));
      }
      return;
    }

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];

      if (handshakePhase === 'WAIT_ARGS' && inst.opcode === 'args') {
        const argNames = inst.args;
        console.log(`[guacd] Received args schema from guacd (${argNames.length} parameters)`);

        // Send client display capabilities
        socket.write(encodeGuacInstruction('size', width, height, dpi));
        socket.write(encodeGuacInstruction('audio', 'audio/ogg'));
        socket.write(encodeGuacInstruction('video'));
        socket.write(encodeGuacInstruction('image', 'image/jpeg', 'image/png', 'image/webp'));

        // Build parameters values matching guacd args schema
        const connectValues = argNames.map((argName) => {
          switch (argName) {
            case 'hostname':
              return options.hostname;
            case 'port':
              return String(options.port);
            case 'username':
              return options.username || '';
            case 'password':
              return options.password || '';
            case 'domain':
              return options.domain || '';
            case 'security':
              return options.security || RdpSecurity.ANY;
            case 'ignore-cert':
              return options.ignoreCert ? 'true' : 'false';
            case 'width':
              return String(width);
            case 'height':
              return String(height);
            case 'dpi':
              return String(dpi);
            case 'color-depth':
              return '32';
            case 'resize-method':
              return 'display-update';
            case 'enable-wallpaper':
              return 'true';
            case 'enable-font-smoothing':
              return 'true';
            case 'enable-full-window-drag':
              return 'true';
            case 'enable-desktop-composition':
              return 'true';
            case 'enable-menu-animations':
              return 'true';
            default:
              return '';
          }
        });

        const connectMsg = encodeGuacInstruction('connect', ...connectValues);
        socket.write(connectMsg);
        handshakePhase = 'READY';
      } else if (handshakePhase === 'READY' && inst.opcode === 'ready') {
        console.log(`[guacd] Handshake COMPLETE. Session ready: ${inst.args[0]}`);
        handshakePhase = 'CONNECTED';
        // Send any instructions after 'ready' in this chunk
        const remainingRaw = rawInstructions.slice(i + 1).join('');
        if (remainingRaw) {
          safeSendWS(remainingRaw);
        }
        break;
      } else if (inst.opcode === 'error') {
        console.error(`[guacd] Protocol Error from guacd: ${inst.args[0]}`);
        safeSendWS(encodeGuacInstruction('error', inst.args[0] || 'Guacamole protocol error', '512'));
        socket.destroy();
        safeCloseWS();
        return;
      }
    }
  });

  socket.on('error', (err: any) => {
    console.error(`[guacd] Socket Error: ${err.message}`);
    safeSendWS(encodeGuacInstruction('error', `guacd connection failed: ${err.message}. Make sure guacd is running on port ${guacdPort}.`, '512'));
    safeCloseWS();
  });

  socket.on('close', () => {
    console.log('[guacd] Socket closed');
    safeCloseWS();
  });

  // Forward client WebSocket instructions to guacd TCP socket
  if (ws.on) {
    ws.on('message', (data: any) => {
      if (socket.writable) {
        socket.write(data.toString());
      }
    });

    ws.on('close', () => {
      console.log('[guacd] WebSocket closed by client');
      if (!socket.destroyed) {
        socket.destroy();
      }
    });
  }
}
