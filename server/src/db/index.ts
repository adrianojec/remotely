import Database from 'better-sqlite3';
import path from 'node:path';
import dotenv from 'dotenv';
import { AuthType, RdpProtocol, RdpSecurity } from './enums.js';

export * from './enums.js';

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
    rdp_enabled INTEGER DEFAULT 1,
    rdp_protocol TEXT DEFAULT '${RdpProtocol.RDP}',
    rdp_port INTEGER DEFAULT 3389,
    rdp_username TEXT,
    rdp_password_encrypted TEXT,
    rdp_domain TEXT,
    rdp_security TEXT DEFAULT '${RdpSecurity.ANY}',
    rdp_ignore_cert INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES server_groups(id) ON DELETE CASCADE
  );
`);

// Migration helper: Ensure group_id & rdp columns exist if table was created earlier
const serverColumns = db.pragma('table_info(servers)') as { name: string }[];
const hasColumn = (colName: string) => serverColumns.some((col) => col.name === colName);

if (!hasColumn('group_id')) {
  db.exec('ALTER TABLE servers ADD COLUMN group_id TEXT;');
}
if (!hasColumn('rdp_enabled')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_enabled INTEGER DEFAULT 1;');
}
if (!hasColumn('rdp_protocol')) {
  db.exec(`ALTER TABLE servers ADD COLUMN rdp_protocol TEXT DEFAULT '${RdpProtocol.RDP}';`);
}
if (!hasColumn('rdp_port')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_port INTEGER DEFAULT 3389;');
}
if (!hasColumn('rdp_username')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_username TEXT;');
}
if (!hasColumn('rdp_password_encrypted')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_password_encrypted TEXT;');
}
if (!hasColumn('rdp_domain')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_domain TEXT;');
}
if (!hasColumn('rdp_security')) {
  db.exec(`ALTER TABLE servers ADD COLUMN rdp_security TEXT DEFAULT '${RdpSecurity.ANY}';`);
}
if (!hasColumn('rdp_ignore_cert')) {
  db.exec('ALTER TABLE servers ADD COLUMN rdp_ignore_cert INTEGER DEFAULT 1;');
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
  auth_type: AuthType;
  credential_encrypted: string;
  group_id?: string | null;
  rdp_enabled?: number;
  rdp_protocol?: RdpProtocol;
  rdp_port?: number;
  rdp_username?: string | null;
  rdp_password_encrypted?: string | null;
  rdp_domain?: string | null;
  rdp_security?: RdpSecurity;
  rdp_ignore_cert?: number;
  created_at?: string;
  updated_at?: string;
}
