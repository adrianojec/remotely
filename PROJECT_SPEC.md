# Project Specification: Remotely

**Remotely** is a self-hosted, web-based remote server management and orchestration dashboard. It enables managing remote Linux servers, Docker containers, PM2 processes, interactive SSH terminal sessions, SFTP file browsing, and future GUI remote desktop capabilities through a unified browser interface.

---

## 1. Tech Stack

- **Backend:**
  - Runtime: Node.js (TypeScript)
  - HTTP & WebSocket Framework: Hono (`@hono/node-server`, `@hono/node-ws`)
  - Remote Gateway & PTY: `ssh2`
  - Database: SQLite (`better-sqlite3` or `prisma`)
  - Security: AES-256-GCM encryption for credentials at rest
- **Frontend:**
  - Framework: React (Vite + TypeScript)
  - UI Library: shadcn/ui (Tailwind CSS v4 + Lucide Icons + Radix UI)
  - In-Browser Terminal: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
  - State & Data Fetching: TanStack React Query + Axios / Fetch

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

### C. Docker & Process Management over SSH

- **Docker:** Execute `docker ps -a --format '{{json .}}'` over SSH to list containers; provide endpoints for container actions (`start`, `stop`, `restart`, `logs`).
- **PM2 / Bare Node:** Parse `pm2 jlist` output to manage non-containerized applications.
- **Graceful Fallbacks:** Structured error responses when Docker or PM2 is not installed on the target machine.

### D. Architecture Roadmap

- **Phase 1 (MVP):** Server manager, SSH terminal, Docker container dashboard, PM2 view.
- **Phase 2:** In-browser SFTP explorer (`ssh2.sftp()`) with Monaco editor for config edits.
- **Phase 3:** RDP/VNC remote desktop gateway integration (`guacd` / noVNC).

---

## 3. UI Layout (shadcn/ui)

- **Sidebar:** Host list with status badges, connection status, quick search (`Command` palette).
- **Server View Tabs:**
  - **Containers:** `DataTable` displaying container state, port mappings, action dropdowns, and logs modal.
  - **Processes:** Process list for bare services.
  - **Terminal:** Full-screen responsive terminal interface.
