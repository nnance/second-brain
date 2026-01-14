# Coding Conventions

**Analysis Date:** 2026-01-13

## Naming Patterns

**Files:**
- kebab-case for all source files (`vault-write.ts`, `mcp-server.ts`, `log-interaction.ts`)
- *.test.ts alongside source files (co-located tests)
- No index.ts barrel files (direct imports preferred)

**Functions:**
- camelCase for all functions (`vaultWrite()`, `generateSlug()`, `runAgent()`, `createSession()`)
- No special prefix for async functions
- Descriptive action verbs (`start*`, `stop*`, `get*`, `create*`, `update*`, `delete*`)

**Variables:**
- camelCase for variables (`fileContent`, `folderPath`, `baseFilename`)
- UPPER_SNAKE_CASE for constants (`TOOL_NAMES`, `CONTENT_FOLDERS`, `TIMEOUT_CHECK_INTERVAL_MS`)
- No underscore prefix for private members

**Types:**
- PascalCase for interfaces (`Config`, `Session`, `VaultWriteParams`, `AgentContext`)
- PascalCase for type aliases (`VaultFolder`, `IncomingMessage`)
- Suffix conventions: `*Params` (input), `*Result` (output), `*Options` (config)

## Code Style

**Formatting:**
- Biome with `biome.json` config
- 2-space indentation
- Double quotes for strings
- Semicolons required

**Linting:**
- Biome linter with recommended rules
- Organized imports enabled
- Run: `npm run lint`

## Import Organization

**Order:**
1. Node.js built-ins (`node:fs/promises`, `node:path`)
2. External packages (`@anthropic-ai/claude-agent-sdk`, `pino`)
3. Internal modules (`./config.js`, `../logger.js`)
4. Type imports

**ESM Requirements:**
- `.js` extension required on all relative imports
- Example: `import { config } from "./config.js"`

**Grouping:**
- Single blank line between import groups
- Biome auto-organizes imports on format

## Error Handling

**Patterns:**
- Try-catch at function boundaries
- Return result objects with `success` boolean
- Log errors with context before returning

**Error Types:**
- Check `error instanceof Error` before accessing `.message`
- Unknown errors: `"Unknown error"` fallback message

**Example Pattern:**
```typescript
try {
  // operation
  return { success: true, data };
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error({ error, params }, "Operation failed");
  return { success: false, error: message };
}
```

## Logging

**Framework:**
- Pino logger instance from `src/logger.ts`
- Levels: debug, info, warn, error, fatal

**Patterns:**
- Structured logging: `logger.info({ userId, action }, "User action")`
- Context object first, message string second
- No console.log in production code

**When to Log:**
- Function entry/exit for main operations
- Error conditions with context
- State transitions (session created, timeout triggered)

## Comments

**When to Comment:**
- Explain why, not what
- Document non-obvious business logic
- Reference external specs or bug fixes

**JSDoc/TSDoc:**
- Not extensively used; TypeScript types serve as documentation
- System prompt in `src/agent/system-prompt.ts` is comprehensive markdown

**TODO Comments:**
- Format: `// TODO: description`
- Note: Some legacy comments reference "H1 fix", "H3 fix" without context

## Function Design

**Size:**
- Keep functions focused, under 50 lines
- Extract helpers for complex logic

**Parameters:**
- Use interface for multiple parameters (e.g., `VaultWriteParams`)
- Destructure at call site when needed

**Return Values:**
- Explicit return types on all functions
- Use result objects for operations that can fail
- `Promise<T>` for async operations

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export interface`)
- Default export only for singleton logger
- Export types alongside implementation

**Dependencies:**
- Import from specific files, not barrels
- Example: `import { config } from "./config.js"` not from index

**Circular Dependencies:**
- None present (clean unidirectional imports)
- Layers import downward only

---

*Convention analysis: 2026-01-13*
*Update when patterns change*
