# Ticket 3.3: Implement Existing Tag Discovery

## Description
Create a module that scans the Obsidian vault to discover existing tags. This allows Claude to reuse existing tags rather than creating duplicates with slightly different names.

## Acceptance Criteria
- [ ] Tag discovery module exists at `src/vault/tags.ts`
- [ ] Scans all markdown files in the vault
- [ ] Extracts tags from YAML frontmatter
- [ ] Returns deduplicated list of tags
- [ ] Caches results to avoid repeated filesystem scans
- [ ] Cache invalidation after configurable interval
- [ ] Unit tests verify tag extraction from frontmatter

## Technical Notes

### Tag Sources
Tags are stored in YAML frontmatter:
```yaml
tags:
  - person/sarah
  - project/security-audit
  - topic/security
  - priority/high
```

### src/vault/tags.ts
```typescript
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

interface TagCache {
  tags: string[];
  timestamp: number;
}

let tagCache: TagCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getExistingTags(): Promise<string[]> {
  const now = Date.now();
  
  if (tagCache && (now - tagCache.timestamp) < CACHE_TTL_MS) {
    logger.debug({ tagCount: tagCache.tags.length }, 'Returning cached tags');
    return tagCache.tags;
  }
  
  logger.debug('Scanning vault for existing tags');
  const tags = await scanVaultForTags();
  
  tagCache = { tags, timestamp: now };
  logger.info({ tagCount: tags.length }, 'Tag cache updated');
  
  return tags;
}

export function clearTagCache(): void {
  tagCache = null;
  logger.debug('Tag cache cleared');
}

async function scanVaultForTags(): Promise<string[]> {
  const allTags = new Set<string>();
  const folders = ['Tasks', 'Ideas', 'Reference', 'Projects', 'Inbox', 'Archive'];
  
  for (const folder of folders) {
    const folderPath = join(config.vaultPath, folder);
    const tags = await scanFolderForTags(folderPath);
    tags.forEach(tag => allTags.add(tag));
  }
  
  return Array.from(allTags).sort();
}

async function scanFolderForTags(folderPath: string): Promise<string[]> {
  const tags: string[] = [];
  
  try {
    const entries = await readdir(folderPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && extname(entry.name) === '.md') {
        const filePath = join(folderPath, entry.name);
        const fileTags = await extractTagsFromFile(filePath);
        tags.push(...fileTags);
      }
    }
  } catch (error) {
    // Folder might not exist yet, that's okay
    logger.debug({ folderPath, error }, 'Could not scan folder');
  }
  
  return tags;
}

async function extractTagsFromFile(filePath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return extractTagsFromContent(content);
  } catch (error) {
    logger.debug({ filePath, error }, 'Could not read file');
    return [];
  }
}

export function extractTagsFromContent(content: string): string[] {
  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];
  
  const frontmatter = frontmatterMatch[1];
  
  // Extract tags array (simple parsing, handles common formats)
  const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*.+\n?)*)/);
  if (!tagsMatch) {
    // Try inline format: tags: [tag1, tag2]
    const inlineMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/);
    if (inlineMatch) {
      return inlineMatch[1]
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }
    return [];
  }
  
  // Parse list format
  const tagLines = tagsMatch[1];
  return tagLines
    .split('\n')
    .map(line => line.replace(/^\s*-\s*/, '').trim())
    .filter(tag => tag.length > 0);
}
```

### Tag Categories
Based on the taxonomy in the design doc:
- `person/{name}` — People
- `project/{name}` — Projects
- `topic/{name}` — Subject areas
- `company/{name}` — Organizations
- `priority/urgent|high|normal|low|someday`
- `status/waiting|active|scheduled|done`

### Unit Tests: src/vault/tags.test.ts
Test cases:
- `extractTagsFromContent` handles list format
- `extractTagsFromContent` handles inline array format
- `extractTagsFromContent` handles no frontmatter
- `extractTagsFromContent` handles no tags field
- Cache functions work correctly

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, tag tests pass
3. File `src/vault/tags.ts` exists
4. Tests exist in `src/vault/tags.test.ts`
