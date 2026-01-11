# Ticket 2.3: Implement vault_write Tool

## Description
Create the `vault_write` tool that the AI agent uses to create notes in the Obsidian vault. This tool takes structured input and creates a properly formatted markdown file with YAML frontmatter. The tool is a pure function with no business logic—it executes the write operation and returns the result.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/vault-write.ts`
- [ ] Accepts folder, title, content, tags, and confidence parameters
- [ ] Generates filenames in format: `YYYY-MM-DD_title-slug.md`
- [ ] Creates valid YAML frontmatter with all metadata
- [ ] Handles filename collisions with numeric suffix
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

### Filename Generation
- Format: `YYYY-MM-DD_title-slug.md`
- Slug rules: lowercase, spaces → hyphens, remove special chars, max 50 chars
- Collision handling: append `-1`, `-2`, etc. if file exists

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

    // Generate slug and filename
    const slug = generateSlug(title);
    const datePrefix = new Date().toISOString().split('T')[0];
    const baseFilename = `${datePrefix}_${slug}.md`;

    // Resolve unique filename
    const folderPath = join(config.vaultPath, folder);
    const { filename, filepath } = await resolveUniqueFilename(folderPath, baseFilename);

    // Format content with frontmatter
    const fileContent = formatNoteContent(title, content, tags, confidence);

    // Write file
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

### Helper Functions
- `generateSlug(title: string): string`
- `resolveUniqueFilename(folderPath: string, baseFilename: string): Promise<{filename, filepath}>`
- `formatNoteContent(title: string, content: string, tags: string[], confidence: number): string`

### Unit Tests: src/tools/vault-write.test.ts
Test cases:
- Creates file in correct folder
- Generates correct filename format
- Creates valid YAML frontmatter
- Handles filename collisions
- Returns success result with filepath
- Returns error result on failure (e.g., invalid folder)
- Slug generation handles edge cases (special chars, long titles)

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, vault-write tests pass
3. File `src/tools/vault-write.ts` exists
4. Tests exist in `src/tools/vault-write.test.ts`
5. Manual test: call function, verify file created with correct content
