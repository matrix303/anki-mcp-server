# Repository Management Guide

## Question: Should anki-mcp-server be a Git Submodule?

This document addresses the question of whether `anki-mcp-server` should be managed as a git submodule within a parent/main repository.

## Current State

`anki-mcp-server` is currently:
- A **standalone npm package** (`@ankimcp/anki-mcp-server`)
- Published to npm with proper semantic versioning (v0.12.1)
- Has its own git repository at `matrix303/anki-mcp-server`
- Self-contained with all necessary build, test, and deployment infrastructure
- Distributable via npm, MCPB bundles, and Docker

## Recommendation: Keep as Standalone Repository

**✅ RECOMMENDED: Continue as a standalone repository**

Here's why this is the best approach for your situation:

### Advantages of Standalone Repository

1. **Independent Release Cycle**
   - Version and release anki-mcp-server independently
   - Semantic versioning already in place (0.12.1)
   - NPM publishing works seamlessly
   - MCPB bundling works without complications

2. **Clear Package Boundaries**
   - anki-mcp-server is a complete, distributable package
   - Users install it via npm or MCPB bundle
   - No confusion about dependencies or build process

3. **Better CI/CD**
   - GitHub Actions can focus on this single package
   - Simpler build/test/release pipelines
   - No monorepo complexity

4. **NPM Ecosystem Integration**
   - Published as a proper npm package
   - Users can `npm install @ankimcp/anki-mcp-server`
   - Follows standard npm package conventions

5. **Docker Support Already Built-in**
   - `.docker/` directory contains E2E testing setup
   - Docker Compose configuration for testing with Anki
   - No need for additional containerization

## When to Consider Git Submodules

Git submodules make sense when:

### ❌ NOT your case:
- You have a **single, independent package** that's distributed standalone
- The package is already published to npm
- The package has its own versioning and release cycle

### ✅ Good submodule use cases:
- **Shared libraries** - Common code used by multiple projects
- **Microservices** - Multiple services that deploy together
- **Documentation sites** - Separate repo for docs that references the main code
- **Template projects** - Boilerplate code reused across projects
- **Vendor dependencies** - Third-party code that needs to be tracked at specific versions

## Alternative Approaches (If You Need Multiple Repos)

If you're considering submodules because you want to:

### 1. Create a Parent Project that Uses anki-mcp-server

**Recommended approach: NPM dependency**

```json
// parent-project/package.json
{
  "dependencies": {
    "@ankimcp/anki-mcp-server": "^0.12.1"
  }
}
```

**Benefits:**
- Standard dependency management
- Version pinning and updates via npm
- No git submodule complexity
- Works with npm scripts and tooling

### 2. Create a Monorepo with Multiple Packages

**Consider: Turborepo or Nx**

If you plan to have multiple related packages (e.g., anki-mcp-server, anki-mcp-web, anki-mcp-cli), consider:

```
my-monorepo/
├── packages/
│   ├── anki-mcp-server/     # Current code
│   ├── anki-mcp-web/         # New package
│   └── anki-mcp-cli/         # New package
├── package.json              # Workspace root
└── turbo.json                # Turborepo config
```

**Tools:**
- [Turborepo](https://turbo.build/) - High-performance build system
- [Nx](https://nx.dev/) - Powerful monorepo toolkit
- [pnpm workspaces](https://pnpm.io/workspaces) - Built-in Node.js solution

**Benefits:**
- Shared dependencies
- Coordinated releases
- Better code sharing
- Still allows independent versioning

### 3. Create Plugin/Extension Architecture

If you want to extend anki-mcp-server with additional features:

**Recommended: NPM plugin system**

```
anki-mcp-server/             # Core (current repo)
anki-mcp-plugins-community/  # Separate repo for community plugins
anki-mcp-plugins-official/   # Separate repo for official plugins
```

Each installs the core as a dependency:

```json
{
  "dependencies": {
    "@ankimcp/anki-mcp-server": "^0.12.1"
  },
  "peerDependencies": {
    "@ankimcp/anki-mcp-server": "^0.12.0"
  }
}
```

## Docker & Packaging Concerns

You mentioned Docker and packaging. The current setup already handles this well:

### Current Docker Setup
- `.docker/docker-compose.yml` - E2E testing environment
- Used for integration testing with real Anki instance
- Not for distributing anki-mcp-server itself

### Distribution Methods Already Available

1. **NPM Package** (for developers)
   ```bash
   npm install -g @ankimcp/anki-mcp-server
   ```

2. **MCPB Bundle** (for Claude Desktop users)
   - Download `.mcpb` file from releases
   - Install via Claude Desktop Settings → Extensions

3. **Local Installation** (for development)
   ```bash
   npm run pack:local
   npm run install:local
   ```

### If You Want to Dockerize anki-mcp-server Itself

Create a `Dockerfile` in the repo root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
COPY bin ./bin

EXPOSE 3000

CMD ["node", "dist/main-http.js"]
```

Then users can:
```bash
docker pull ghcr.io/matrix303/anki-mcp-server:latest
docker run -p 3000:3000 ghcr.io/matrix303/anki-mcp-server
```

**This still works better as a standalone repo!**

## Summary & Action Plan

### Current Best Practice: Standalone Repository ✅

Your current setup is optimal. To improve it:

1. **Keep the current structure** - Don't add submodules
2. **Consider adding a Dockerfile** - For containerized deployments
3. **Document integration patterns** - Show how others can use your package
4. **Consider monorepo only if** - You're creating multiple related packages

### If You Need Git Submodules Later

Only consider submodules if:
- You create a **separate main application** that embeds anki-mcp-server
- You need to **track specific commits** across multiple repos
- You're building a **meta-project** that coordinates multiple independent repos

For now, the npm dependency model is cleaner and more maintainable.

## Further Reading

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Turborepo Monorepo Guide](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## Questions or Concerns?

If you have specific use cases that aren't covered here, please open an issue explaining:
- What you're trying to build
- Why you think submodules might help
- What problems you're trying to solve

The community can provide more targeted advice based on your specific needs.
