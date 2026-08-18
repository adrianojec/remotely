import { Hono } from 'hono';
import { db, ServerRecord, AuthType, RdpProtocol, RdpSecurity, HttpStatus } from '../db/index.js';
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
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, group_id, rdp_enabled, rdp_protocol, rdp_port, rdp_username, rdp_domain, rdp_security, rdp_ignore_cert, created_at, updated_at FROM servers ORDER BY created_at DESC');
  const servers = stmt.all();

  return c.json({ success: true, servers });
});

// GET single server
serversRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, group_id, rdp_enabled, rdp_protocol, rdp_port, rdp_username, rdp_domain, rdp_security, rdp_ignore_cert, created_at, updated_at FROM servers WHERE id = ?');
  const server = stmt.get(id);

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  return c.json({ success: true, server });
});

// POST test connection (without saving)
serversRouter.post('/test', async (c) => {
  const body = await c.req.json();
  const { host, port, username, authType, credential } = body;

  if (!host || !username || !authType || !credential) {
    return c.json({ success: false, message: 'Missing required connection parameters' }, HttpStatus.BAD_REQUEST);
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
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  const creds = getServerCredentials(server);
  const result = await testSshConnection(creds);

  return c.json(result);
});

// POST create server
serversRouter.post('/', async (c) => {
  const body = await c.req.json();

  const {
    name, host, port, username, authType, credential, groupId,
    rdpProtocol, rdpPort, rdpUsername, rdpPassword, rdpDomain, rdpSecurity, rdpIgnoreCert
  } = body;

  if (!name || !host || !username || !authType || !credential) {
    return c.json({ success: false, message: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
  }

  const id = crypto.randomUUID();
  const credentialEncrypted = encrypt(credential);
  const validGroupId = groupId && typeof groupId === 'string' && groupId.trim() !== '' ? groupId.trim() : null;

  const protocol = rdpProtocol === RdpProtocol.VNC ? RdpProtocol.VNC : RdpProtocol.RDP;
  const defaultRdpPort = protocol === RdpProtocol.VNC ? 5900 : 3389;
  const parsedRdpPort = Number(rdpPort) || defaultRdpPort;
  const rdpPasswordEncrypted = rdpPassword && typeof rdpPassword === 'string' && rdpPassword.trim() !== ''
    ? encrypt(rdpPassword)
    : null;

  const stmt = db.prepare(`
    INSERT INTO servers (
      id, name, host, port, username, auth_type, credential_encrypted, group_id,
      rdp_protocol, rdp_port, rdp_username, rdp_password_encrypted, rdp_domain, rdp_security, rdp_ignore_cert
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, name, host, Number(port) || 22, username, authType, credentialEncrypted, validGroupId,
    protocol, parsedRdpPort, rdpUsername || null, rdpPasswordEncrypted, rdpDomain || null,
    rdpSecurity || RdpSecurity.ANY, rdpIgnoreCert !== false ? 1 : 0
  );

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
      rdp_protocol: protocol,
      rdp_port: parsedRdpPort,
      rdp_username: rdpUsername || null,
      rdp_domain: rdpDomain || null,
      rdp_security: rdpSecurity || RdpSecurity.ANY,
      rdp_ignore_cert: rdpIgnoreCert !== false ? 1 : 0,
    },
  });
});

// PUT update server
serversRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const {
    name, host, port, username, authType, credential, groupId,
    rdpProtocol, rdpPort, rdpUsername, rdpPassword, rdpDomain, rdpSecurity, rdpIgnoreCert
  } = body;

  const checkStmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const existing = checkStmt.get(id) as ServerRecord | undefined;

  if (!existing) {
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  if (!name || !host || !username || !authType) {
    return c.json({ success: false, message: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
  }

  let credentialEncrypted = existing.credential_encrypted;

  if (credential && typeof credential === 'string' && credential.trim() !== '') {
    credentialEncrypted = encrypt(credential);
  }

  let rdpPasswordEncrypted = existing.rdp_password_encrypted;

  if (rdpPassword !== undefined) {
    if (typeof rdpPassword === 'string' && rdpPassword.trim() !== '') {
      rdpPasswordEncrypted = encrypt(rdpPassword);
    } else {
      rdpPasswordEncrypted = null;
    }
  }

  const validGroupId = groupId && typeof groupId === 'string' && groupId.trim() !== '' ? groupId.trim() : null;

  if (validGroupId) {
    const groupCheck = db.prepare('SELECT id FROM server_groups WHERE id = ?').get(validGroupId);
    if (!groupCheck) {
      return c.json({ success: false, message: 'Target group not found' }, HttpStatus.NOT_FOUND);
    }
  }

  const protocol = rdpProtocol === RdpProtocol.VNC ? RdpProtocol.VNC : RdpProtocol.RDP;
  const defaultRdpPort = protocol === RdpProtocol.VNC ? 5900 : 3389;
  const parsedRdpPort = Number(rdpPort) || defaultRdpPort;

  const updateStmt = db.prepare(`
    UPDATE servers
    SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, credential_encrypted = ?, group_id = ?,
        rdp_protocol = ?, rdp_port = ?, rdp_username = ?, rdp_password_encrypted = ?, rdp_domain = ?,
        rdp_security = ?, rdp_ignore_cert = ?, updated_at = CURRENT_TIMESTAMP
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
    parsedRdpPort,
    rdpUsername || null,
    rdpPasswordEncrypted,
    rdpDomain || null,
    rdpSecurity || RdpSecurity.ANY,
    rdpIgnoreCert !== false ? 1 : 0,
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
    rdp_protocol: protocol,
    rdp_port: parsedRdpPort,
    rdp_username: rdpUsername || null,
    rdp_domain: rdpDomain || null,
    rdp_security: rdpSecurity || RdpSecurity.ANY,
    rdp_ignore_cert: rdpIgnoreCert !== false ? 1 : 0,
  };

  return c.json({ success: true, server: updatedServer });
});

// PATCH update remote desktop config for a server
serversRouter.patch('/:id/desktop', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { rdpProtocol, rdpPort, rdpUsername, rdpPassword, rdpDomain, rdpSecurity, rdpIgnoreCert } = body;

  const checkStmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const existing = checkStmt.get(id) as ServerRecord | undefined;

  if (!existing) {
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  const protocol = rdpProtocol === RdpProtocol.VNC ? RdpProtocol.VNC : RdpProtocol.RDP;
  const defaultRdpPort = protocol === RdpProtocol.VNC ? 5900 : 3389;
  const parsedRdpPort = Number(rdpPort) || defaultRdpPort;

  let rdpPasswordEncrypted = existing.rdp_password_encrypted;

  if (rdpPassword !== undefined) {
    if (typeof rdpPassword === 'string' && rdpPassword.trim() !== '') {
      rdpPasswordEncrypted = encrypt(rdpPassword);
    } else {
      rdpPasswordEncrypted = null;
    }
  }

  const updateStmt = db.prepare(`
    UPDATE servers
    SET rdp_protocol = ?, rdp_port = ?, rdp_username = ?, rdp_password_encrypted = ?,
        rdp_domain = ?, rdp_security = ?, rdp_ignore_cert = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  updateStmt.run(
    protocol,
    parsedRdpPort,
    rdpUsername || null,
    rdpPasswordEncrypted,
    rdpDomain || null,
    rdpSecurity || RdpSecurity.ANY,
    rdpIgnoreCert !== false ? 1 : 0,
    id
  );

  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, group_id, rdp_enabled, rdp_protocol, rdp_port, rdp_username, rdp_domain, rdp_security, rdp_ignore_cert, created_at, updated_at FROM servers WHERE id = ?');
  const updatedServer = stmt.get(id);

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
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  if (validGroupId) {
    const groupCheck = db.prepare('SELECT id FROM server_groups WHERE id = ?').get(validGroupId);
    if (!groupCheck) {
      return c.json({ success: false, message: 'Target group not found' }, HttpStatus.NOT_FOUND);
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
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  return c.json({ success: true, message: 'Server deleted successfully' });
});

