import { Hono } from 'hono';
import { db, ServerRecord, HttpStatus } from '../db/index.js';
import { getServerCredentials } from './servers.js';
import {
  listSftpDirectory,
  readSftpFile,
  writeSftpFile,
  downloadSftpFileBuffer,
  uploadSftpFileBuffer,
  createSftpDirectory,
  createSftpFile,
  deleteSftpItem,
  renameSftpItem,
} from '../services/sftp.js';

export const sftpRouter = new Hono();

// Helper to validate and fetch server credentials
function getCredentialsForServer(serverId: string) {
  const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
  const server = stmt.get(serverId) as ServerRecord | undefined;

  if (!server) {
    throw new Error('Server not found');
  }

  return getServerCredentials(server);
}

// GET /api/servers/:id/sftp/list?path=...
sftpRouter.get('/:id/sftp/list', async (c) => {
  const id = c.req.param('id');
  const pathQuery = c.req.query('path');

  try {
    const creds = getCredentialsForServer(id);
    const result = await listSftpDirectory(creds, pathQuery);

    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to list directory' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// GET /api/servers/:id/sftp/read?path=...
sftpRouter.get('/:id/sftp/read', async (c) => {
  const id = c.req.param('id');
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ success: false, message: 'File path parameter is required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);
    const fileData = await readSftpFile(creds, filePath);

    return c.json({ success: true, ...fileData });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to read file' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/servers/:id/sftp/write
sftpRouter.post('/:id/sftp/write', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { path: filePath, content } = body;

  if (!filePath || content === undefined) {
    return c.json({ success: false, message: 'Path and content are required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);
    await writeSftpFile(creds, filePath, content);

    return c.json({ success: true, message: 'File saved successfully' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to write file' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// GET /api/servers/:id/sftp/download?path=...
sftpRouter.get('/:id/sftp/download', async (c) => {
  const id = c.req.param('id');
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ success: false, message: 'File path parameter is required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);
    const { data, filename } = await downloadSftpFileBuffer(creds, filePath);

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    return c.body(new Uint8Array(data));
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to download file' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/servers/:id/sftp/upload
sftpRouter.post('/:id/sftp/upload', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.parseBody();
    const targetPath = body['path'] as string;
    const file = body['file'] as File | undefined;

    if (!targetPath || !file) {
      return c.json({ success: false, message: 'Missing upload target path or file' }, HttpStatus.BAD_REQUEST);
    }

    const creds = getCredentialsForServer(id);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fullRemotePath = targetPath.endsWith('/')
      ? `${targetPath}${file.name}`
      : `${targetPath}/${file.name}`;

    await uploadSftpFileBuffer(creds, fullRemotePath, buffer);

    return c.json({ success: true, message: 'File uploaded successfully', path: fullRemotePath });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to upload file' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/servers/:id/sftp/mkdir
sftpRouter.post('/:id/sftp/mkdir', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { path: dirPath } = body;

  if (!dirPath) {
    return c.json({ success: false, message: 'Directory path is required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);

    await createSftpDirectory(creds, dirPath);

    return c.json({ success: true, message: 'Directory created successfully' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to create directory' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/servers/:id/sftp/touch
sftpRouter.post('/:id/sftp/touch', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { path: filePath } = body;

  if (!filePath) {
    return c.json({ success: false, message: 'File path is required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);

    await createSftpFile(creds, filePath);

    return c.json({ success: true, message: 'File created successfully' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to create file' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// DELETE /api/servers/:id/sftp/delete
sftpRouter.delete('/:id/sftp/delete', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { path: itemPath, isDirectory } = body;

  if (!itemPath) {
    return c.json({ success: false, message: 'Item path is required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);

    await deleteSftpItem(creds, itemPath, Boolean(isDirectory));

    return c.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to delete item' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/servers/:id/sftp/rename
sftpRouter.post('/:id/sftp/rename', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { oldPath, newPath } = body;

  if (!oldPath || !newPath) {
    return c.json({ success: false, message: 'Old path and new path are required' }, HttpStatus.BAD_REQUEST);
  }

  try {
    const creds = getCredentialsForServer(id);

    await renameSftpItem(creds, oldPath, newPath);
    
    return c.json({ success: true, message: 'Item renamed successfully' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to rename item' }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});
