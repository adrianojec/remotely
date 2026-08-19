import { Hono } from 'hono';
import { db, ServerRecord, HttpStatus } from '../db/index.js';
import { getServerCredentials } from './servers.js';
import { fetchServerMetrics } from '../services/metrics.js';

export const metricsRouter = new Hono();

// GET /:id/metrics - Fetch live system metrics for server
metricsRouter.get('/:id/metrics', async (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(id) as ServerRecord | undefined;

  if (!server) {
    return c.json({ success: false, message: 'Server not found' }, HttpStatus.NOT_FOUND);
  }

  try {
    const creds = getServerCredentials(server);
    const metrics = await fetchServerMetrics(creds);
    return c.json({ success: true, metrics });
  } catch (err: any) {
    return c.json(
      { success: false, message: err.message || 'Failed to fetch server metrics' },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});
