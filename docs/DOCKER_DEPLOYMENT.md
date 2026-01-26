# Docker Deployment Guide

This guide explains how to deploy anki-mcp-server using Docker for production environments.

## ⚠️ Known Issue: Docker Build from Source

There's a known npm bug that can cause `npm install` to hang during Docker builds.

**Recommended Workaround:** Build and run locally with npm/npx instead of Docker:

```bash
# Option 1: Run directly with npm
npm install
npm run build  
npm run start:prod:http

# Option 2: Install globally
npm install -g @ankimcp/anki-mcp-server
ankimcp

# Option 3: Use npx (no installation needed)
npx @ankimcp/anki-mcp-server
```

**For Docker enthusiasts:** The Dockerfiles are provided as a reference. To use them:
1. Comment out `dist/` in `.dockerignore`
2. Build locally: `npm run build`
3. Build Docker image: `docker build -f Dockerfile.simple -t anki-mcp-server .`

The project team is monitoring the npm bug. Once resolved, Docker builds from source will work seamlessly.

## Quick Start

```bash
# Build locally first
npm run build

# Start the server with Docker Compose
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop the server
docker compose -f docker-compose.prod.yml down
```

## Building the Image

### Method 1: Pre-build Locally (Recommended)

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Using Docker CLI

```bash
# Build
docker build -t anki-mcp-server:latest .

# Run
docker run -d \
  --name anki-mcp-server \
  -p 3000:3000 \
  -e ANKI_CONNECT_URL=http://host.docker.internal:8765 \
  --restart unless-stopped \
  anki-mcp-server:latest
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address (0.0.0.0 for Docker) |
| `ANKI_CONNECT_URL` | `http://host.docker.internal:8765` | AnkiConnect endpoint |
| `NODE_ENV` | `production` | Node environment |

### Connecting to Anki

The AnkiConnect URL depends on your operating system:

**Windows/Mac:**
```bash
ANKI_CONNECT_URL=http://host.docker.internal:8765
```

**Linux:**
```bash
# Option 1: Use host network mode
docker run --network host ...

# Option 2: Use host's IP address
ANKI_CONNECT_URL=http://192.168.1.100:8765  # Replace with your IP
```

## Production Deployment

### Using Docker Compose

The `docker-compose.prod.yml` file includes production-ready settings:

```yaml
services:
  anki-mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ANKI_CONNECT_URL=http://host.docker.internal:8765
      - PORT=3000
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### With Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name anki-mcp.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### With SSL/TLS (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d anki-mcp.example.com

# Auto-renewal is configured automatically
```

## Running Both Anki and anki-mcp-server in Docker

If you want to run a containerized Anki instance alongside the server:

```yaml
services:
  anki:
    image: ghcr.io/ankimcp/headless-anki:x11-vnc-v1.1.0
    volumes:
      - anki-data:/home/anki/.local/share/Anki2
    ports:
      - "8765:8765"   # AnkiConnect API
      - "5900:5900"   # VNC (for debugging)
    restart: unless-stopped

  anki-mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ANKI_CONNECT_URL=http://anki:8765  # Use service name
      - PORT=3000
      - NODE_ENV=production
    depends_on:
      - anki
    restart: unless-stopped

volumes:
  anki-data:
```

## Health Checks

The Docker image includes a built-in health check that verifies the server is responding:

```bash
# Check if server is responding
curl http://localhost:3000/

# The server should respond with HTTP status < 500
```

Docker will automatically restart the container if health checks fail.

## Monitoring

### View Logs

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml logs -f

# Docker CLI
docker logs -f anki-mcp-server
```

### Container Stats

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml stats

# Docker CLI
docker stats anki-mcp-server
```

## Updating

### Using Docker Compose

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Using Docker CLI

```bash
# Rebuild image
docker build -t anki-mcp-server:latest .

# Stop and remove old container
docker stop anki-mcp-server
docker rm anki-mcp-server

# Start new container
docker run -d \
  --name anki-mcp-server \
  -p 3000:3000 \
  -e ANKI_CONNECT_URL=http://host.docker.internal:8765 \
  --restart unless-stopped \
  anki-mcp-server:latest
```

## Troubleshooting

### Cannot Connect to AnkiConnect

**Problem:** Server can't reach AnkiConnect at `http://host.docker.internal:8765`

**Solutions:**

1. **On Linux:** Use host IP instead:
   ```bash
   # Find your IP
   ip addr show | grep "inet "
   
   # Use it in environment variable
   ANKI_CONNECT_URL=http://192.168.1.100:8765
   ```

2. **Check AnkiConnect is running:**
   ```bash
   curl http://localhost:8765
   # Should return AnkiConnect version info
   ```

3. **Configure AnkiConnect to allow Docker requests:**
   
   In Anki → Tools → Add-ons → AnkiConnect → Config:
   ```json
   {
     "webBindAddress": "0.0.0.0",
     "webBindPort": 8765,
     "webCorsOriginList": ["http://localhost:3000"]
   }
   ```

### Container Keeps Restarting

**Check logs:**
```bash
docker logs anki-mcp-server
```

**Common issues:**
- Port 3000 already in use
- Invalid ANKI_CONNECT_URL
- Missing environment variables

### Health Check Failing

**Test manually:**
```bash
docker exec anki-mcp-server node -e "require('http').get('http://localhost:3000/', (r) => console.log(r.statusCode))"
```

## Security Considerations

1. **Bind to localhost in development:**
   ```bash
   # Don't expose to internet without authentication
   docker run -p 127.0.0.1:3000:3000 ...
   ```

2. **Use HTTPS in production:**
   - Set up a reverse proxy (Nginx/Traefik)
   - Use Let's Encrypt for SSL certificates
   - Configure CORS properly

3. **Network isolation:**
   ```bash
   # Create isolated network
   docker network create anki-network
   
   # Run containers in that network
   docker run --network anki-network ...
   ```

4. **Limit resources:**
   ```yaml
   services:
     anki-mcp-server:
       deploy:
         resources:
           limits:
             cpus: '1.0'
             memory: 512M
   ```

## Advanced Configuration

### Custom Port Mapping

```bash
# Use different external port
docker run -p 8080:3000 ...

# Then access at http://localhost:8080
```

### Multiple Instances

```bash
# Instance 1
docker run -d --name anki-mcp-1 -p 3000:3000 \
  -e ANKI_CONNECT_URL=http://host.docker.internal:8765 \
  anki-mcp-server:latest

# Instance 2
docker run -d --name anki-mcp-2 -p 3001:3000 \
  -e ANKI_CONNECT_URL=http://host.docker.internal:8766 \
  anki-mcp-server:latest
```

### Persistent Logs

```yaml
services:
  anki-mcp-server:
    volumes:
      - ./logs:/app/logs
    environment:
      - LOG_FILE=/app/logs/server.log
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    tags:
      - 'v*'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```

## Further Reading

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Node.js Dockerfiles](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [AnkiConnect Documentation](https://foosoft.net/projects/anki-connect/)
