import { Hono } from 'hono';
import { db, ServerRecord } from '../db/index.js';
import { getServerCredentials } from './servers.js';
import { listPm2Processes, handlePm2Action } from '../services/pm2.js';

export const pm2Router = new Hono();

// GET list processes for server
pm2Router.get('/:id/processes', async (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await listPm2Processes(creds);

  return c.json({ success: true, ...result });
});

// POST PM2 process action (restart / stop / delete)
pm2Router.post('/:id/action', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { pmId, action } = body;

  if (pmId === undefined || !action) {
    return c.json({ success: false, message: 'Process ID and action are required' }, 400);
  }

  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, 404);
  }

  const creds = getServerCredentials(server);
  const result = await handlePm2Action(creds, pmId, action);

  return c.json(result);
});
