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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES server_groups(id) ON DELETE CASCADE
  );
`);

// Migration helper: Ensure group_id column exists if table was created earlier without it
const serverColumns = db.pragma('table_info(servers)') as { name: string }[];
const hasGroupId = serverColumns.some((col) => col.name === 'group_id');
if (!hasGroupId) {
  db.exec('ALTER TABLE servers ADD COLUMN group_id TEXT;');
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
  created_at?: string;
  updated_at?: string;
}
