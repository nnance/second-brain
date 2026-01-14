# Ticket 1.2: Add Archived Metadata on Move

## Description

Enhance the `vault_move` tool to add archival metadata to the note's frontmatter when moving to the Archive folder. This preserves the original location and timestamp for future reference.

## Acceptance Criteria

- [ ] When destination is "Archive", add `archived_at` ISO timestamp to frontmatter
- [ ] When destination is "Archive", add `original_folder` with source folder name
- [ ] Metadata is only added for Archive moves (not other folder moves)
- [ ] Existing frontmatter is preserved and extended
- [ ] Notes without frontmatter get frontmatter added
- [ ] Unit tests cover archival metadata scenarios

## Technical Notes

**Updated Frontmatter Example:**
```yaml
---
created: 2026-01-10T14:32:00Z
tags:
  - person/sarah
  - status/done
confidence: 92
archived_at: 2026-01-14T10:15:00Z
original_folder: Tasks
---
```

**Implementation Approach:**
1. Read file content before move
2. Parse existing frontmatter
3. If destination is "Archive":
   - Add `archived_at: <current ISO timestamp>`
   - Add `original_folder: <source folder>`
4. Rewrite file with updated frontmatter
5. Move file to destination

**Edge Cases:**
- File has no frontmatter → create new frontmatter block
- File already has `archived_at` → overwrite with current timestamp
- Source is nested path → extract just the folder name

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including metadata tests
3. `npm run lint` shows no errors
4. Manual test: Move note to Archive, verify frontmatter contains archived_at and original_folder
5. Manual test: Move note to Projects (not Archive), verify no archived_at added
