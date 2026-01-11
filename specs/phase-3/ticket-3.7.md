# Ticket 3.7: Update Interaction Log with Categorization Details

## Description
Extend the interaction log to include full categorization details: category, confidence, reasoning, and tags assigned. This provides auditability for how Claude categorized each input.

## Acceptance Criteria
- [ ] Log entry includes category
- [ ] Log entry includes confidence percentage
- [ ] Log entry includes Claude's reasoning
- [ ] Log entry includes tags assigned
- [ ] Log format matches design doc specification
- [ ] Updated interface supports new fields

## Technical Notes

### Updated Log Format
```markdown
---

## 14:32:00

**Input:** "remind me to follow up with Sarah about the security audit"

**Categorization:**
- Category: Tasks
- Confidence: 92%
- Reasoning: Clear action verb, named person, specific topic

**Tags assigned:**
- person/sarah
- project/security-audit
- topic/security
- priority/high

**Stored:** `Tasks/2026-01-10_follow-up-sarah-security-audit.md`

---
```

### src/vault/interaction-log.ts Updates

Update `LogEntry` interface:
```typescript
export interface LogEntry {
  timestamp: Date;
  input: string;
  storedPath: string;
  // New fields for Phase 3
  category?: string;
  confidence?: number;
  reasoning?: string;
  tags?: string[];
}
```

Update `formatLogEntry` function:
```typescript
function formatLogEntry(entry: LogEntry): string {
  const timeStr = entry.timestamp.toISOString().split('T')[1].split('.')[0];
  
  let content = `
---

## ${timeStr}

**Input:** "${entry.input}"
`;

  // Add categorization details if present
  if (entry.category !== undefined) {
    content += `
**Categorization:**
- Category: ${entry.category}
- Confidence: ${entry.confidence}%
- Reasoning: ${entry.reasoning || 'N/A'}

**Tags assigned:**
${entry.tags?.map(t => `- ${t}`).join('\n') || '- (none)'}
`;
  }

  content += `
**Stored:** \`${entry.storedPath}\`
`;

  return content;
}
```

### Updated Message Handler Call
```typescript
await writeInteractionLog({
  timestamp,
  input: message.text,
  storedPath: `${analysis.category}/${result.fileName}`,
  category: analysis.category,
  confidence: analysis.confidence,
  reasoning: analysis.reasoning,
  tags: analysis.tags,
});
```

### Backward Compatibility
The new fields are optional, so Phase 2 log entries (without categorization) will still work if the system ever falls back to inbox-only mode.

### Unit Tests Updates: src/vault/interaction-log.test.ts
Add test cases:
- `formatLogEntry` includes categorization when present
- `formatLogEntry` handles missing optional fields gracefully
- Tags are formatted as list

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, interaction log tests pass
3. Send a test message
4. Verify `_system/logs/YYYY-MM-DD.md` contains:
   - Category
   - Confidence percentage
   - Reasoning
   - Tags list
   - Stored path
