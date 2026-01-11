# Ticket 2.5: Implement vault_list Tool

## Description
Create the `vault_list` tool that the AI agent uses to discover existing notes in the vault. This enables the agent to find related notes, check for duplicates, or browse content by folder or tags. Returns file metadata without full content.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/vault-list.ts`
- [ ] Lists files in specified folder (or all folders if not specified)
- [ ] Optionally filters by tags
- [ ] Returns file metadata: filepath, title, tags, created date
- [ ] Supports limit parameter for result count
- [ ] Returns structured result with success status
- [ ] Never throws—returns error in result object
- [ ] Comprehensive unit tests

## Technical Notes

### Tool Interface
```typescript
// src/tools/vault-list.ts

export interface VaultListParams {
  folder?: string;      // Folder to list (all content folders if omitted)
  tags?: string[];      // Filter by tags (AND logic - must have all)
  limit?: number;       // Max results (default 20)
}

export interface VaultFileInfo {
  filepath: string;
  title: string;
  tags: string[];
  created: string;      // ISO date string
}

export interface VaultListResult {
  success: boolean;
  files?: VaultFileInfo[];
  error?: string;
}

export async function vaultList(params: VaultListParams): Promise<VaultListResult> {
  // Implementation
}
```

### Implementation Strategy
1. Determine folders to scan (specified folder or all content folders)
2. Read all `.md` files in those folders
3. Parse frontmatter to extract metadata
4. Filter by tags if specified
5. Sort by created date (newest first)
6. Apply limit

### Content Folders
```typescript
const CONTENT_FOLDERS = ['Tasks', 'Ideas', 'Reference', 'Projects', 'Inbox', 'Archive'];
```

### Frontmatter Parsing
Use a simple YAML frontmatter parser or regex to extract:
- `created` field
- `tags` array

```typescript
function parseFrontmatter(content: string): { created?: string; tags?: string[] } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  // Parse created and tags from yaml string
  // Consider using a lightweight YAML parser like 'yaml' package
}
```

### Implementation Skeleton
```typescript
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

const CONTENT_FOLDERS = ['Tasks', 'Ideas', 'Reference', 'Projects', 'Inbox', 'Archive'];

export async function vaultList(params: VaultListParams): Promise<VaultListResult> {
  try {
    const { folder, tags, limit = 20 } = params;

    const foldersToScan = folder ? [folder] : CONTENT_FOLDERS;
    const allFiles: VaultFileInfo[] = [];

    for (const folderName of foldersToScan) {
      const folderPath = join(config.vaultPath, folderName);
      const files = await scanFolder(folderPath, folderName);
      allFiles.push(...files);
    }

    // Filter by tags if specified
    let filtered = allFiles;
    if (tags && tags.length > 0) {
      filtered = allFiles.filter(file =>
        tags.every(tag => file.tags.includes(tag))
      );
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => b.created.localeCompare(a.created));

    // Apply limit
    const result = filtered.slice(0, limit);

    logger.debug({ folder, tags, resultCount: result.length }, 'vault_list: Listed files');

    return {
      success: true,
      files: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, params }, 'vault_list: Failed');
    return {
      success: false,
      error: message,
    };
  }
}

async function scanFolder(folderPath: string, folderName: string): Promise<VaultFileInfo[]> {
  // Read directory, filter .md files, parse each file's frontmatter
}
```

### Unit Tests: src/tools/vault-list.test.ts
Test cases:
- Lists all files when no folder specified
- Lists files from specific folder
- Filters by single tag
- Filters by multiple tags (AND logic)
- Respects limit parameter
- Returns empty array for empty folder
- Handles missing folder gracefully
- Sorts by created date (newest first)

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, vault-list tests pass
3. File `src/tools/vault-list.ts` exists
4. Tests exist in `src/tools/vault-list.test.ts`
5. Manual test: create test files, verify listing and filtering works
