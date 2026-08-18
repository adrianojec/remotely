import { Hono } from 'hono';
import { db, ServerRecord } from '../db/index.js';
import { getServerCredentials } from './servers.js';
import { listDockerContainers, handleDockerAction, fetchDockerLogs } from '../services/docker.js';

export const dockerRouter = new Hono();

// GET list containers for server
dockerRouter.get('/:id/containers', async (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await listDockerContainers(creds);

  return c.json({ success: true, ...result });
});

// POST container action (start / stop / restart)
dockerRouter.post('/:id/action', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { containerId, action } = body;

  if (!containerId || !action) {
    return c.json({ success: false, message: 'Container ID and action are required' }, 400);
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await handleDockerAction(creds, containerId, action);

  return c.json(result);
});

// GET container logs
dockerRouter.get('/:id/logs', async (c) => {
  const id = c.req.param('id');
  const containerId = c.req.query('containerId');
  const tailStr = c.req.query('tail');
  const tail = tailStr ? parseInt(tailStr, 10) : 100;

  if (!containerId) {
    return c.json({ success: false, message: 'Container ID query param is required' }, 400);
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await fetchDockerLogs(creds, containerId, tail);

  return c.json(result);
});
