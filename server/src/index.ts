import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { cors } from 'hono/cors';
import dotenv from 'dotenv';
import { serversRouter } from './routes/servers.js';
import { groupsRouter } from './routes/groups.js';
import { dockerRouter } from './routes/docker.js';
import { sftpRouter } from './routes/sftp.js';
import { metricsRouter } from './routes/metrics.js';
import { handleTerminalWebSocket } from './routes/terminal.js';
import { handleDesktopWebSocket } from './routes/desktop.js';

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const app = new Hono();

// CORS Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Setup WebSockets
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket route for Terminal
app.get(
  '/ws/terminal',
  upgradeWebSocket((c) => {
    const reqUrl = c.req.url;
    return {
      onOpen(evt, ws) {
        handleTerminalWebSocket(ws, reqUrl);
      },
    };
  })
);

// WebSocket route for Remote Desktop
app.get(
  '/ws/desktop',
  upgradeWebSocket((c) => {
    const reqUrl = c.req.url;
    return {
      onOpen(evt, ws) {
        handleDesktopWebSocket(ws, reqUrl);
      },
    };
  })
);

// REST API Routers
app.route('/api/groups', groupsRouter);
app.route('/api/servers', serversRouter);
app.route('/api/servers', dockerRouter);
app.route('/api/servers', sftpRouter);
app.route('/api/servers', metricsRouter);

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log(`🚀 Remotely Backend starting on http://localhost:${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

injectWebSocket(server);
