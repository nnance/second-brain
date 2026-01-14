# Ticket 1.1: Create vault_move Tool

## Description

Create a new `vault_move` tool that allows the agent to relocate notes between folders in the vault. This is the foundation for archive lifecycle management.

## Acceptance Criteria

- [ ] New file `src/tools/vault-move.ts` created
- [ ] Tool accepts source filepath and destination folder
- [ ] Tool validates source file exists
- [ ] Tool validates destination is a valid vault folder
- [ ] Tool moves the file (rename operation) to destination
- [ ] Tool returns success with new filepath, or error message
- [ ] Tool is registered in MCP server
- [ ] Unit tests cover success and error cases

## Technical Notes

**Tool Schema:**
```typescript
interface VaultMoveParams {
  source: string;      // Relative path like "Tasks/2026-01-10_follow-up.md"
  destination: string; // Folder name like "Archive"
}

interface VaultMoveResult {
  success: boolean;
  newFilepath?: string;  // "Archive/2026-01-10_follow-up.md"
  error?: string;
}
```

**Implementation Pattern:**
- Follow existing tool patterns (see `vault-write.ts`, `vault-read.ts`)
- Use `fs.rename()` for atomic move
- Validate paths to prevent directory traversal
- Log the move operation

**MCP Server Registration:**
- Add tool definition to `src/agent/mcp-server.ts`
- Include in tool list with appropriate schema

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including new vault-move tests
3. `npm run lint` shows no errors
4. Tool appears in MCP server tool list
5. Manual test: Move a test note from Tasks to Archive works
