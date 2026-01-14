# Ticket 3.2: Implement vault_read Tool

## Description
Create the `vault_read` tool that enables the AI agent to read existing notes from the Obsidian vault. This allows the agent to check for related notes, read previous context, or verify stored content.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/vault-read.ts`
- [ ] Accepts filepath relative to vault root
- [ ] Returns file content including frontmatter
- [ ] Handles file not found gracefully
- [ ] Returns structured result with success status
- [ ] Never throws—returns error in result object
- [ ] Validates path to prevent directory traversal
- [ ] Comprehensive unit tests

## Technical Notes

### Tool Interface
```typescript
// src/tools/vault-read.ts

export interface VaultReadParams {
  filepath: string;  // Path relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"
}

export interface VaultReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export async function vaultRead(params: VaultReadParams): Promise<VaultReadResult> {
  // Implementation
}
```

### Implementation
```typescript
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

export async function vaultRead(params: VaultReadParams): Promise<VaultReadResult> {
  try {
    const { filepath } = params;

    // Validate path (prevent directory traversal)
    if (!isValidVaultPath(filepath)) {
      return {
        success: false,
        error: 'Invalid path: directory traversal not allowed',
      };
    }

    const fullPath = join(config.vaultPath, filepath);
    const content = await readFile(fullPath, 'utf-8');

    logger.debug({ filepath }, 'vault_read: Note read');

    return {
      success: true,
      content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug({ filepath: params.filepath }, 'vault_read: File not found');
      return {
        success: false,
        error: `File not found: ${params.filepath}`,
      };
    }

    logger.error({ error, params }, 'vault_read: Failed');
    return {
      success: false,
      error: message,
    };
  }
}

function isValidVaultPath(filepath: string): boolean {
  const normalized = normalize(filepath);
  return !normalized.startsWith('..') && !normalized.includes('../');
}
```

### Security Consideration
- Validate that filepath doesn't escape vault directory (no `../` traversal)
- Normalize path before validation

### Unit Tests: src/tools/vault-read.test.ts
Test cases:
- Reads existing file successfully
- Returns content with frontmatter intact
- Returns error for non-existent file
- Blocks path traversal attempts (`../etc/passwd`)
- Handles files in nested folders (`_system/logs/2026-01-10.md`)

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, vault-read tests pass
3. File `src/tools/vault-read.ts` exists
4. Tests exist in `src/tools/vault-read.test.ts`
5. Manual test: create a test file, read it with the tool, verify content matches
