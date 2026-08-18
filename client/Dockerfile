# Stage 1: Build Vite React Client
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace package definitions
COPY package.json package-lock.json ./
COPY client/package.json ./client/

# Install client dependencies
RUN npm install --workspace=client

# Copy client source
COPY client ./client

# Build production bundle
WORKDIR /app/client
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copy custom Nginx proxy config
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
