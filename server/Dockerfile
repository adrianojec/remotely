FROM node:20-slim

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install server dependencies
RUN npm install --workspace=server

# Copy server source code
COPY server ./server

# Build server TypeScript code
WORKDIR /app/server
RUN npm run build

# Create directory for SQLite persistent database
RUN mkdir -p /app/data

EXPOSE 3001

ENV PORT=3001
ENV DATABASE_PATH=/app/data/remotely.db
ENV GUACD_HOST=guacd
ENV GUACD_PORT=4822

CMD ["node", "dist/index.js"]
