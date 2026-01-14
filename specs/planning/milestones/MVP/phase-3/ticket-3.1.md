# Ticket 3.1: Refactor Vault Writer to vault_write Tool

## Description
Refactor the existing `src/vault/writer.ts` from Phase 2 into an agent-callable tool at `src/tools/vault-write.ts`. The tool accepts structured parameters and returns structured results. It supports writing to any folder (not just Inbox) with full metadata.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/vault-write.ts`
- [ ] Accepts folder, title, content, tags, and confidence parameters
- [ ] Reuses slug generation and filename logic from Phase 2
- [ ] Supports all vault folders (Tasks, Ideas, Reference, Projects, Inbox, Archive)
- [ ] Returns structured result with success status and filepath
- [ ] Never throws—returns error in result object
- [ ] Comprehensive unit tests

## Technical Notes

### Tool Interface
```typescript
// src/tools/vault-write.ts

export type VaultFolder = 'Tasks' | 'Ideas' | 'Reference' | 'Projects' | 'Inbox' | 'Archive';

export interface VaultWriteParams {
  folder: VaultFolder;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
}

export interface VaultWriteResult {
  success: boolean;
  filepath?: string;
  filename?: string;
  error?: string;
}

export async function vaultWrite(params: VaultWriteParams): Promise<VaultWriteResult> {
  // Implementation
}
```

### Reusing Phase 2 Logic
The existing `src/vault/writer.ts` has:
- `generateSlug()` — Convert title to filename-safe slug
- `resolveUniqueFileName()` — Handle filename collisions
- `formatNoteContent()` — Create markdown with frontmatter

These can be extracted or reimplemented in the tool.

### Key Differences from Phase 2
| Phase 2 | Phase 3 Tool |
|---------|--------------|
| Always writes to Inbox | Writes to specified folder |
| Uses `source: imessage` | Doesn't set source |
| `confidence: null` | Confidence from agent |
| `tags: []` empty | Tags from agent |
| Throws on error | Returns error result |

### Frontmatter Format
```yaml
---
created: 2026-01-10T14:32:00Z
tags:
  - person/sarah
  - project/security-audit
confidence: 92
---
```

### Implementation Skeleton
```typescript
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

export async function vaultWrite(params: VaultWriteParams): Promise<VaultWriteResult> {
  try {
    const { folder, title, content, tags, confidence } = params;

    const slug = generateSlug(title);
    const datePrefix = new Date().toISOString().split('T')[0];
    const baseFilename = `${datePrefix}_${slug}.md`;

    const folderPath = join(config.vaultPath, folder);
    const { filename, filepath } = await resolveUniqueFilename(folderPath, baseFilename);

    const fileContent = formatNoteContent(title, content, tags, confidence);
    await writeFile(filepath, fileContent, 'utf-8');

    logger.info({ filepath, folder }, 'vault_write: Note created');

    return {
      success: true,
      filepath: `${folder}/${filename}`,
      filename,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, params }, 'vault_write: Failed');
    return {
      success: false,
      error: message,
    };
  }
}
```

### Unit Tests: src/tools/vault-write.test.ts
Test cases:
- Creates file in correct folder
- Generates correct filename format
- Creates valid YAML frontmatter with tags
- Handles filename collisions
- Returns success result with filepath
- Returns error result on failure
- Slug generation handles edge cases

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, vault-write tests pass
3. File `src/tools/vault-write.ts` exists
4. Tests exist in `src/tools/vault-write.test.ts`
5. Manual test: call function, verify file created with correct content
