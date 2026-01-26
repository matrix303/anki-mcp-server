# Multi-stage Dockerfile for anki-mcp-server HTTP mode
# This allows deployment of anki-mcp-server as a containerized service

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

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
