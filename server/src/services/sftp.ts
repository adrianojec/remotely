import { Client, SFTPWrapper, Stats } from 'ssh2';
import path from 'path';
import { buildSshConfig, SshCredentials } from '../utils/ssh.js';

export interface SftpItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  size: number;
  mode: number;
  modifiedAt: string;
}

export interface DirectoryListing {
  currentPath: string;
  items: SftpItem[];
}

/**
 * Creates and returns an SSH client connection and initialized SFTP wrapper instance.
 */
function getSftpSession(creds: SshCredentials): Promise<{ conn: Client; sftp: SFTPWrapper }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config = buildSshConfig(creds);

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        resolve({ conn, sftp });
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    try {
      conn.connect(config);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Normalizes POSIX paths for remote Linux filesystem
 */
function normalizeRemotePath(p: string): string {
  if (!p || p === '.') return '';

  return path.posix.normalize(p);
}

/**
 * List files and directories in the requested remote path.
 * If targetPath is empty, resolves the user's home directory.
 */
export async function listSftpDirectory(creds: SshCredentials, targetPath?: string): Promise<DirectoryListing> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const resolvePath = (pathRequested?: string) => {
      if (!pathRequested || pathRequested.trim() === '') {
        sftp.realpath('.', (err, absPath) => {
          if (err) {
            fetchDir('/');
          } else {
            fetchDir(absPath || '/');
          }
        });
      } else {
        fetchDir(normalizeRemotePath(pathRequested));
      }
    };

    const fetchDir = (dirPath: string) => {
      sftp.readdir(dirPath, (err, list) => {
        conn.end();

        if (err) {
          return reject(err);
        }

        const items: SftpItem[] = list.map((entry) => {
          const stats: Stats = entry.attrs;
          const isDir = (stats.mode & 0o40000) !== 0;
          const isSymLink = (stats.mode & 0o120000) === 0o120000;
          const fullItemPath = dirPath === '/' ? `/${entry.filename}` : `${dirPath}/${entry.filename}`;

          return {
            name: entry.filename,
            path: fullItemPath,
            isDirectory: isDir,
            isSymbolicLink: isSymLink,
            size: stats.size || 0,
            mode: stats.mode,
            modifiedAt: new Date((stats.mtime || 0) * 1000).toISOString(),
          };
        });

        // Filter out '.' and '..' and sort directories first
        const filteredItems = items
          .filter((item) => item.name !== '.' && item.name !== '..')
          .sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });

        resolve({
          currentPath: dirPath,
          items: filteredItems,
        });
      });
    };

    resolvePath(targetPath);
  });
}

/**
 * Read contents of a remote text file (capped at 2 MB)
 */
export async function readSftpFile(creds: SshCredentials, remotePath: string): Promise<{ content: string; size: number }> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);

    sftp.stat(cleanPath, (err, stats) => {
      if (err) {
        conn.end();
        return reject(err);
      }

      const MAX_PREVIEW_SIZE = 2 * 1024 * 1024; // 2 MB

      if (stats.size > MAX_PREVIEW_SIZE) {
        conn.end();

        return reject(new Error(`File size (${(stats.size / 1024 / 1024).toFixed(2)} MB) exceeds 2 MB limit for inline editor view. Please download the file directly.`));
      }

      sftp.readFile(cleanPath, 'utf8', (readErr, data) => {
        conn.end();

        if (readErr) {
          return reject(readErr);
        }

        const textContent = typeof data === 'string' ? data : data.toString('utf8');

        resolve({ content: textContent, size: stats.size });
      });
    });
  });
}

/**
 * Save text content to a remote file
 */
export async function writeSftpFile(creds: SshCredentials, remotePath: string, content: string): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);

    sftp.writeFile(cleanPath, content, 'utf8', (err) => {
      conn.end();

      if (err) return reject(err);

      resolve();
    });
  });
}

/**
 * Download a remote file as a Buffer
 */
export async function downloadSftpFileBuffer(creds: SshCredentials, remotePath: string): Promise<{ data: Buffer; filename: string }> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);
    const filename = path.posix.basename(cleanPath);

    sftp.readFile(cleanPath, (err, buffer) => {
      conn.end();

      if (err) return reject(err);

      resolve({ data: buffer, filename });
    });
  });
}

/**
 * Upload a file buffer to a remote location
 */
export async function uploadSftpFileBuffer(creds: SshCredentials, remotePath: string, buffer: Buffer): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);

    sftp.writeFile(cleanPath, buffer as any, (err: any) => {
      conn.end();

      if (err) return reject(err);

      resolve();
    });
  });
}

/**
 * Create a new remote directory
 */
export async function createSftpDirectory(creds: SshCredentials, remotePath: string): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);

    sftp.mkdir(cleanPath, (err) => {
      conn.end();

      if (err) return reject(err);

      resolve();
    });
  });
}

/**
 * Create a new blank file
 */
export async function createSftpFile(creds: SshCredentials, remotePath: string): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);
    sftp.writeFile(cleanPath, '', 'utf8', (err) => {

      conn.end();

      if (err) return reject(err);

      resolve();
    });
  });
}

/**
 * Delete a remote file or folder
 */
export async function deleteSftpItem(creds: SshCredentials, remotePath: string, isDirectory: boolean): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanPath = normalizeRemotePath(remotePath);

    if (isDirectory) {
      sftp.rmdir(cleanPath, (err) => {
        conn.end();

        if (err) return reject(err);

        resolve();
      });
    } else {
      sftp.unlink(cleanPath, (err) => {
        conn.end();

        if (err) return reject(err);

        resolve();
      });
    }
  });
}

/**
 * Rename/move a remote file or folder
 */
export async function renameSftpItem(creds: SshCredentials, oldPath: string, newPath: string): Promise<void> {
  const { conn, sftp } = await getSftpSession(creds);

  return new Promise((resolve, reject) => {
    const cleanOldPath = normalizeRemotePath(oldPath);
    const cleanNewPath = normalizeRemotePath(newPath);

    sftp.rename(cleanOldPath, cleanNewPath, (err) => {
      conn.end();

      if (err) return reject(err);
      
      resolve();
    });
  });
}
