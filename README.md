# Remotely 🚀

**Remotely** is a self-hosted, web-based remote infrastructure management platform. It allows managing remote Linux and Windows servers through a unified browser interface—featuring interactive SSH terminal sessions, Docker container control, SFTP file management, and GUI Remote Desktop (RDP / VNC).

---

## 📦 Features

- 🖥️ **Remote Desktop (GUI)**: In-browser Windows Remote Desktop (RDP) & Linux GUI (VNC) powered by Apache Guacamole (`guacd`).
- 💻 **Interactive SSH Terminal**: Full-featured PTY terminal using `@xterm/xterm` over WebSockets.
- 🐳 **Docker Container Dashboard**: Inspect container status, view real-time logs, start, stop, and restart containers over SSH.
- 📁 **SFTP File Explorer**: Drag-and-drop file upload, file downloading, directory management, and an in-browser live text/code editor.
- 🔐 **Encrypted Credentials**: Passwords and PEM private keys encrypted at rest with AES-256-GCM.
- 📁 **Server Grouping**: Organize hosts into customizable groups.

---

## 🐳 Quick Start with Docker Compose

Running **Remotely** and its Apache Guacamole gateway (`guacd`) takes a single command:

```bash
docker compose up -d
```

### Services Started:

1. **`client`** (Port `80`): React + Vite SPA served via Nginx reverse proxy.
2. **`server`** (Port `3001`): Node.js + Hono backend & WebSocket gateway with SQLite database volume.
3. **`guacd`** (Port `4822`): Apache Guacamole daemon handling RDP and VNC protocol translation.

Access the dashboard in your browser at: **`http://localhost`**

---

## 🛠️ Local Development (Without Docker)

### Prerequisites
- Node.js 20+
- Docker (for `guacd` gateway)

### 1. Run Guacamole Gateway Daemon
```bash
docker run -d -p 4822:4822 --name guacd guacamole/guacd:latest
```

### 2. Install Dependencies & Start Dev Servers
```bash
# Install workspace dependencies
npm install

# Start Backend API & WS Server (Port 3001)
npm run dev:server

# In a separate terminal, start Frontend Vite App (Port 5173)
npm run dev:client
```

---

## 📂 Project Structure

```
remotely/
├── client/              # React (Vite + Tailwind CSS v4 + guacamole-common-js)
│   ├── src/components/  # Terminal, Desktop, SFTP, Docker & Layout components
│   ├── nginx.conf       # Reverse proxy configuration
│   └── Dockerfile       # Multi-stage production build
├── server/              # Node.js (Hono + SQLite + ssh2 + net socket)
│   ├── src/routes/      # Terminal, Desktop (Guacamole), SFTP & Docker routes
│   └── Dockerfile       # Node.js backend container definition
├── docker-compose.yml   # Multi-container orchestration (client + server + guacd)
└── PROJECT_SPEC.md      # Technical specification
```
