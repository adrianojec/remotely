import Database from 'better-sqlite3';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './remotely.db';
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS server_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT NOT NULL,
    credential_encrypted TEXT NOT NULL,
    group_id TEXT,
    desktop_protocol TEXT DEFAULT 'rdp',
    desktop_port INTEGER DEFAULT 3389,
    desktop_width INTEGER DEFAULT 1920,
    desktop_height INTEGER DEFAULT 1080,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES server_groups(id) ON DELETE CASCADE
  );
`);

// Migration helper: Ensure group_id & desktop columns exist if table was created earlier without them
const serverColumns = db.pragma('table_info(servers)') as { name: string }[];
const hasGroupId = serverColumns.some((col) => col.name === 'group_id');
if (!hasGroupId) {
  db.exec('ALTER TABLE servers ADD COLUMN group_id TEXT;');
}

const hasDesktopProtocol = serverColumns.some((col) => col.name === 'desktop_protocol');
if (!hasDesktopProtocol) {
  db.exec("ALTER TABLE servers ADD COLUMN desktop_protocol TEXT DEFAULT 'rdp';");
  db.exec('ALTER TABLE servers ADD COLUMN desktop_port INTEGER DEFAULT 3389;');
  db.exec('ALTER TABLE servers ADD COLUMN desktop_width INTEGER DEFAULT 1920;');
  db.exec('ALTER TABLE servers ADD COLUMN desktop_height INTEGER DEFAULT 1080;');
}

export interface GroupRecord {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServerRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'privateKey';
  credential_encrypted: string;
  group_id?: string | null;
  desktop_protocol?: 'rdp' | 'vnc' | 'ssh' | null;
  desktop_port?: number | null;
  desktop_width?: number | null;
  desktop_height?: number | null;
  created_at?: string;
  updated_at?: string;
}
