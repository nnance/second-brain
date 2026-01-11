# Ticket 2.3: Implement Markdown File Writer

## Description
Create a module that writes markdown files to the Obsidian vault with proper YAML frontmatter. Handles filename generation, slug creation, and collision detection (appends suffix if file exists).

## Acceptance Criteria
- [ ] File writer module exists at `src/vault/writer.ts`
- [ ] Generates filenames in format: `YYYY-MM-DD_title-slug.md`
- [ ] Creates valid YAML frontmatter
- [ ] Appends numeric suffix (`-1`, `-2`) if filename exists
- [ ] Writes to specified folder within vault
- [ ] Returns the path of the created file
- [ ] Unit tests cover slug generation and frontmatter formatting

## Technical Notes

### Filename Format
`YYYY-MM-DD_title-slug.md`

Example: `2026-01-10_follow-up-sarah-security-audit.md`

### Slug Rules
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Truncate to reasonable length (50 chars max)

### Frontmatter Structure (Phase 2 - Basic)
```yaml
---
created: 2026-01-10T14:32:00Z
source: imessage
confidence: null
tags: []
---
```

### src/vault/writer.ts
```typescript
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

export interface NoteMetadata {
  created: Date;
  source: string;
  confidence: number | null;
  tags: string[];
}

export interface WriteNoteOptions {
  folder: string;  // e.g., 'Inbox', 'Tasks'
  title: string;
  body: string;
  metadata: NoteMetadata;
}

export interface WriteNoteResult {
  filePath: string;
  fileName: string;
}

export async function writeNote(options: WriteNoteOptions): Promise<WriteNoteResult> {
  const { folder, title, body, metadata } = options;
  
  const slug = generateSlug(title);
  const datePrefix = formatDatePrefix(metadata.created);
  const baseFileName = `${datePrefix}_${slug}.md`;
  
  const folderPath = join(config.vaultPath, folder);
  const { fileName, filePath } = await resolveUniqueFileName(folderPath, baseFileName);
  
  const content = formatNoteContent(title, body, metadata);
  await writeFile(filePath, content, 'utf-8');
  
  logger.info({ filePath, folder }, 'Note written');
  
  return { filePath, fileName };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function formatDatePrefix(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatNoteContent(title: string, body: string, metadata: NoteMetadata): string {
  const frontmatter = [
    '---',
    `created: ${metadata.created.toISOString()}`,
    `source: ${metadata.source}`,
    `confidence: ${metadata.confidence}`,
    `tags: [${metadata.tags.join(', ')}]`,
    '---',
    '',
    `# ${title}`,
    '',
    body,
  ].join('\n');
  
  return frontmatter;
}

async function resolveUniqueFileName(folderPath: string, baseFileName: string): Promise<{ fileName: string; filePath: string }> {
  let fileName = baseFileName;
  let filePath = join(folderPath, fileName);
  let suffix = 0;
  
  while (await fileExists(filePath)) {
    suffix++;
    const nameParts = baseFileName.replace('.md', '');
    fileName = `${nameParts}-${suffix}.md`;
    filePath = join(folderPath, fileName);
  }
  
  return { fileName, filePath };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
```

### Unit Tests: src/vault/writer.test.ts
Test cases:
- `generateSlug` converts titles correctly
- `formatDatePrefix` produces `YYYY-MM-DD`
- `formatNoteContent` produces valid frontmatter
- Filename collision handling appends suffix

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, writer tests pass
3. File `src/vault/writer.ts` exists
4. Tests exist in `src/vault/writer.test.ts`
