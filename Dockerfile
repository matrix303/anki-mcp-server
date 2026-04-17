# Multi-stage Dockerfile for anki-mcp-server HTTP mode
# This allows deployment of anki-mcp-server as a containerized service
# Note: Using debian-slim and upgrading npm due to known npm issues

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Upgrade npm to latest version to avoid known bugs
RUN npm install -g npm@latest

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Upgrade npm to latest version
RUN npm install -g npm@latest

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

# Copy necessary files
COPY README.md LICENSE ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV ANKI_CONNECT_URL=http://host.docker.internal:8765

# Expose the HTTP port
EXPOSE 3000

# Health check (checks if server is responding)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1))" || exit 1

# Run the HTTP server
CMD ["node", "dist/main-http.js", "--port", "3000", "--host", "0.0.0.0"]
