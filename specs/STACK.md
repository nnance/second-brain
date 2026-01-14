# Technology Stack

**Analysis Date:** 2026-01-13

## Languages

**Primary:**
- TypeScript 5.7.3 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Config files only (package.json)

## Runtime

**Environment:**
- Node.js ≥20.0.0 (LTS required) - `package.json` engines field
- ES modules (type: "module") - `package.json`

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None (vanilla Node.js application)

**Testing:**
- Node.js native test runner - built-in `node:test` module
- tsx 4.19.2 - TypeScript execution without build step

**Build/Dev:**
- TypeScript 5.7.3 - Compilation to ES2022/NodeNext
- tsx - Development execution

## Key Dependencies

**Critical:**
- `@anthropic-ai/claude-agent-sdk` ^0.2.5 - AI agent orchestration, MCP server creation (`src/agent/client.ts`)
- `@photon-ai/imessage-kit` ^2.1.0 - iMessage capture and sending (`src/messages/listener.ts`)
- `zod` ^4.3.5 - Tool parameter schema validation (`src/agent/mcp-server.ts`)

**Infrastructure:**
- `pino` ^9.14.0 - Structured logging (`src/logger.ts`)
- `pino-pretty` ^11.3.0 (dev) - Pretty-printed logs for development
- `dotenv` ^17.2.3 - Environment configuration loading (`src/config.ts`)

## Configuration

**Environment:**
- `.env` files (gitignored)
- `.env.example` template provided
- Required: `VAULT_PATH`, `ANTHROPIC_API_KEY`
- Optional: `CLAUDE_MODEL`, `LOG_LEVEL`, `SESSION_TIMEOUT_MS`

**Build:**
- `tsconfig.json` - TypeScript compiler (ES2022, NodeNext modules, strict mode)
- `biome.json` - Linting and formatting

## Platform Requirements

**Development:**
- macOS required (iMessage SDK depends on macOS Messages.app)
- Node.js 20+ installed

**Production:**
- macOS only (iMessage integration)
- Runs as long-running Node.js process
- Local Obsidian vault storage

---

*Stack analysis: 2026-01-13*
*Update after major dependency changes*
