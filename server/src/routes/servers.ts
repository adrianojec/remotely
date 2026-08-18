import { Hono } from 'hono';
import { db, ServerRecord } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { testSshConnection, SshCredentials } from '../utils/ssh.js';
import crypto from 'node:crypto';

export const serversRouter = new Hono();

// Helper to get plaintext credentials for a server record
export function getServerCredentials(server: ServerRecord): SshCredentials {
  const plainCredential = decrypt(server.credential_encrypted);
  return {
    host: server.host,
    port: server.port,
    username: server.username,
    authType: server.auth_type,
    credential: plainCredential,
  };
}

// GET all servers (sanitized: hides encrypted/plain credentials)
serversRouter.get('/', (c) => {
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, group_id, desktop_protocol, desktop_port, desktop_width, desktop_height, created_at, updated_at FROM servers ORDER BY created_at DESC');
  const servers = stmt.all();
  return c.json({ success: true, servers });
});

// GET single server
serversRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, group_id, desktop_protocol, desktop_port, desktop_width, desktop_height, created_at, updated_at FROM servers WHERE id = ?');
  const server = stmt.get(id);

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  return c.json({ success: true, server });
});

// POST test connection (without saving)
serversRouter.post('/test', async (c) => {
  const body = await c.req.json();
  const { host, port, username, authType, credential } = body;

  if (!host || !username || !authType || !credential) {
    return c.json({ success: false, message: 'Missing required connection parameters' }, 400);
  }

  const result = await testSshConnection({
    host,
    port: Number(port) || 22,
    username,
    authType,
    credential,
  });

  return c.json(result);
});

// POST test stored server connection
serversRouter.post('/:id/test', async (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await testSshConnection(creds);
  return c.json(result);
});

// POST create server
serversRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { name, host, port, username, authType, credential, groupId, desktopProtocol, desktopPort, desktopWidth, desktopHeight } = body;

  if (!name || !host || !username || !authType || !credential) {
    return c.json({ success: false, message: 'Missing required fields' }, 400);
  }

  const id = crypto.randomUUID();
  const credentialEncrypted = encrypt(credential);
  const validGroupId = groupId && typeof groupId === 'string' && groupId.trim() !== '' ? groupId.trim() : null;
  const protocol = desktopProtocol || 'rdp';
  const dPort = Number(desktopPort) || (protocol === 'vnc' ? 5900 : 3389);
  const dWidth = Number(desktopWidth) || 1920;
  const dHeight = Number(desktopHeight) || 1080;

  const stmt = db.prepare(`
    INSERT INTO servers (id, name, host, port, username, auth_type, credential_encrypted, group_id, desktop_protocol, desktop_port, desktop_width, desktop_height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, host, Number(port) || 22, username, authType, credentialEncrypted, validGroupId, protocol, dPort, dWidth, dHeight);

  return c.json({
    success: true,
    server: {
      id,
      name,
      host,
      port: Number(port) || 22,
      username,
      auth_type: authType,
      group_id: validGroupId,
      desktop_protocol: protocol,
      desktop_port: dPort,
      desktop_width: dWidth,
      desktop_height: dHeight,
    },
  });
});

// PUT update server
serversRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, host, port, username, authType, credential, groupId, desktopProtocol, desktopPort, desktopWidth, desktopHeight } = body;

  const checkStmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const existing = checkStmt.get(id) as ServerRecord | undefined;
  if (!existing) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  if (!name || !host || !username || !authType) {
    return c.json({ success: false, message: 'Missing required fields' }, 400);
  }

  let credentialEncrypted = existing.credential_encrypted;
  if (credential && typeof credential === 'string' && credential.trim() !== '') {
    credentialEncrypted = encrypt(credential);
  }

  const validGroupId = groupId && typeof groupId === 'string' && groupId.trim() !== '' ? groupId.trim() : null;
  if (validGroupId) {
    const groupCheck = db.prepare('SELECT id FROM server_groups WHERE id = ?').get(validGroupId);
    if (!groupCheck) {
      return c.json({ success: false, message: 'Target group not found' }, 404);
    }
  }

  const protocol = desktopProtocol || existing.desktop_protocol || 'rdp';
  const dPort = Number(desktopPort) || existing.desktop_port || (protocol === 'vnc' ? 5900 : 3389);
  const dWidth = Number(desktopWidth) || existing.desktop_width || 1920;
  const dHeight = Number(desktopHeight) || existing.desktop_height || 1080;

  const updateStmt = db.prepare(`
    UPDATE servers
    SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, credential_encrypted = ?, group_id = ?, desktop_protocol = ?, desktop_port = ?, desktop_width = ?, desktop_height = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  updateStmt.run(
    name,
    host,
    Number(port) || 22,
    username,
    authType,
    credentialEncrypted,
    validGroupId,
    protocol,
    dPort,
    dWidth,
    dHeight,
    id
  );

  const updatedServer = {
    id,
    name,
    host,
    port: Number(port) || 22,
    username,
    auth_type: authType,
    group_id: validGroupId,
    desktop_protocol: protocol,
    desktop_port: dPort,
    desktop_width: dWidth,
    desktop_height: dHeight,
  };

  return c.json({ success: true, server: updatedServer });
});

// PATCH assign/move server to a group
serversRouter.patch('/:id/group', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { groupId } = body; // can be string or null

  const validGroupId = groupId && typeof groupId === 'string' && groupId.trim() !== '' ? groupId.trim() : null;

  const checkStmt = db.prepare('SELECT id FROM servers WHERE id = ?');
  const existing = checkStmt.get(id);
  if (!existing) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  if (validGroupId) {
    const groupCheck = db.prepare('SELECT id FROM server_groups WHERE id = ?').get(validGroupId);
    if (!groupCheck) {
      return c.json({ success: false, message: 'Target group not found' }, 404);
    }
  }

  const updateStmt = db.prepare('UPDATE servers SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  updateStmt.run(validGroupId, id);

  return c.json({ success: true, message: 'Server group updated successfully', group_id: validGroupId });
});

// DELETE server
serversRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('DELETE FROM servers WHERE id = ?');
  const res = stmt.run(id);

  if (res.changes === 0) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  return c.json({ success: true, message: 'Server deleted successfully' });
});
