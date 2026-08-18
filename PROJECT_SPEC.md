# Project Specification: Remotely

**Remotely** is a self-hosted, web-based remote server management and orchestration dashboard. It enables managing remote Linux servers, Docker containers, interactive SSH terminal sessions, SFTP file browsing, and future GUI remote desktop capabilities through a unified browser interface.

---

## 1. Tech Stack

- **Backend:**
  - Runtime: Node.js (TypeScript)
  - HTTP & WebSocket Framework: Hono (`@hono/node-server`, `@hono/node-ws`)
  - Remote Gateway & PTY: `ssh2`
  - Database: SQLite (`better-sqlite3`)
  - Security: AES-256-GCM encryption for credentials at rest
- **Frontend:**
  - Framework: React (Vite + TypeScript)
  - UI Components: Custom Tailwind CSS v4 components (`clsx` + `tailwind-merge` + `lucide-react`)
  - In-Browser Terminal: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
  - State & Data Fetching: React Hooks + Native `fetch` API

---

## 2. Core Architecture & Requirements

### A. Server Credential Storage & Encryption

- Store host metadata (`id`, `name`, `host`, `port`, `username`, `authType`).
- Encrypt sensitive SSH credentials (passwords, private keys) at rest using AES-256-GCM.
- Provide CRUD endpoints for server configurations with connection pre-flight testing.

### B. In-Browser Interactive Terminal (PTY over WebSocket)

- WebSocket endpoint: `/ws/terminal?serverId=<id>&cols=80&rows=24`
- Backend spawns a pseudo-terminal stream via `ssh2.Client.shell()` and pipes bidirectional I/O to the client.
- Frontend embeds `@xterm/xterm` with automatic resizing via `@xterm/addon-fit`.

### C. Docker Container Management over SSH

- **Docker:** Execute `docker ps -a --format '{{json .}}'` over SSH to list containers; provide endpoints for container actions (`start`, `stop`, `restart`, `logs`).
- **Graceful Fallbacks:** Structured error responses when Docker is not installed on the target machine.

### D. In-Browser SFTP File Explorer & Management

- **SFTP Gateway:** Initiate SFTP subsystem sessions over SSH using `ssh2.Client.sftp()`.
- **Remote Filesystem Operations:** Browse remote directories, view file details (sizes, permissions, modification dates), stream file uploads & downloads, create directories & files, rename, and delete remote items.
- **In-Browser Config & Code Editor:** View and edit text/config files (`.env`, `.conf`, `.yml`, `.json`, `.sh`) directly in the web UI.

### E. Architecture Roadmap

- **Phase 1 (MVP):** Server manager, SSH terminal, Docker container dashboard, in-browser SFTP explorer.
- **Phase 2:** RDP/VNC remote desktop gateway integration (`guacd` / noVNC).

---

## 3. UI Layout (Tailwind CSS)

- **Sidebar:** Host list with status badges, connection status, quick search, group filtering.
- **Server View Tabs:**
  - **Terminal:** Full-screen responsive terminal interface (`@xterm/xterm`).
  - **Containers:** `DataTable` displaying container state, port mappings, action dropdowns, and logs modal.
  - **SFTP Explorer:** Remote filesystem file browser with breadcrumbs, drag-and-drop upload, download, file creation, and live text editor modal.


