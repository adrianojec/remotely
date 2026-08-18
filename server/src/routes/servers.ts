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
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, created_at, updated_at FROM servers ORDER BY created_at DESC');
  const servers = stmt.all();
  return c.json({ success: true, servers });
});

// GET single server
serversRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT id, name, host, port, username, auth_type, created_at, updated_at FROM servers WHERE id = ?');
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
  const { name, host, port, username, authType, credential } = body;

  if (!name || !host || !username || !authType || !credential) {
    return c.json({ success: false, message: 'Missing required fields' }, 400);
  }

  const id = crypto.randomUUID();
  const credentialEncrypted = encrypt(credential);

  const stmt = db.prepare(`
    INSERT INTO servers (id, name, host, port, username, auth_type, credential_encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, host, Number(port) || 22, username, authType, credentialEncrypted);

  return c.json({
    success: true,
    server: {
      id,
      name,
      host,
      port: Number(port) || 22,
      username,
      auth_type: authType,
    },
  });
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
