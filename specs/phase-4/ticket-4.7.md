# Ticket 4.7: Update Interaction Log with Clarification Details

## Description
Extend the interaction log to capture clarification flow details: when clarification was requested, what question was asked, what response was received, and the final categorization after clarification.

## Acceptance Criteria
- [ ] Log entry includes clarification question when asked
- [ ] Log entry includes user's clarification response
- [ ] Log entry shows final category after clarification (may differ from initial guess)
- [ ] Separate log entries for: initial receipt, clarification sent, response processed
- [ ] Timeout scenarios are logged appropriately

## Technical Notes

### Updated Log Format for Clarification Flow
```markdown
---

## 14:45:12

**Input:** "interesting article about zero-trust architecture"

**Categorization:**
- Category: Reference (initial guess)
- Confidence: 58%
- Reasoning: Topic clear, but unclear if this is a link, a note-to-self, or a thought to expand

**Clarification requested:** "Is this a link you want me to save, a concept to research later, or a thought you want to capture?"

---

## 14:47:30

**Clarification response to:** "interesting article about zero-trust architecture"

**User response:** "link to save"

**Final categorization:**
- Category: Reference
- Confidence: 95%

**Tags assigned:**
- topic/security
- priority/normal

**Stored:** `Reference/2026-01-10_zero-trust-architecture-article.md`

---
```

### Extended LogEntry Interface
```typescript
export interface LogEntry {
  timestamp: Date;
  input: string;
  storedPath?: string;  // Optional - not present for clarification request
  
  // Categorization details
  category?: string;
  confidence?: number;
  reasoning?: string;
  tags?: string[];
  
  // Clarification flow details
  clarificationRequested?: string;  // The question asked
  clarificationResponseTo?: string; // Original input this responds to
  userResponse?: string;            // The clarification response
  finalCategory?: string;           // Category after clarification
  finalConfidence?: number;         // Confidence after clarification
  timedOut?: boolean;               // Whether this was a timeout
}
```

### Log Entry Types

**1. Initial receipt with clarification needed:**
```typescript
await writeInteractionLog({
  timestamp,
  input: message.text,
  category: analysis.category,
  confidence: analysis.confidence,
  reasoning: analysis.reasoning,
  clarificationRequested: clarificationQuestion,
});
```

**2. Clarification response processed:**
```typescript
await writeInteractionLog({
  timestamp,
  input: userResponse,
  clarificationResponseTo: originalInput,
  userResponse: userResponse,
  finalCategory: resolvedAnalysis.category,
  finalConfidence: resolvedAnalysis.confidence,
  tags: resolvedAnalysis.tags,
  storedPath: `${resolvedAnalysis.category}/${result.fileName}`,
});
```

**3. Timeout:**
```typescript
await writeInteractionLog({
  timestamp,
  input: originalInput,
  category: 'Inbox',
  confidence: originalConfidence,
  reasoning: 'Clarification timed out',
  tags: [...originalTags, 'status/unresolved'],
  timedOut: true,
  storedPath: `Inbox/${result.fileName}`,
});
```

### Updated formatLogEntry Function
Handle all the new fields conditionally:
```typescript
function formatLogEntry(entry: LogEntry): string {
  const timeStr = formatTime(entry.timestamp);
  let content = `\n---\n\n## ${timeStr}\n\n`;
  
  // Clarification response case
  if (entry.clarificationResponseTo) {
    content += `**Clarification response to:** "${entry.clarificationResponseTo}"\n\n`;
    content += `**User response:** "${entry.userResponse}"\n\n`;
    content += `**Final categorization:**\n`;
    content += `- Category: ${entry.finalCategory}\n`;
    content += `- Confidence: ${entry.finalConfidence}%\n\n`;
  } else {
    // Normal input case
    content += `**Input:** "${entry.input}"\n\n`;
    
    if (entry.category) {
      content += `**Categorization:**\n`;
      content += `- Category: ${entry.category}${entry.timedOut ? ' (timed out)' : ''}\n`;
      content += `- Confidence: ${entry.confidence}%\n`;
      content += `- Reasoning: ${entry.reasoning || 'N/A'}\n\n`;
    }
    
    if (entry.clarificationRequested) {
      content += `**Clarification requested:** "${entry.clarificationRequested}"\n`;
    }
  }
  
  // Tags and storage (when applicable)
  if (entry.tags && entry.tags.length > 0) {
    content += `\n**Tags assigned:**\n`;
    content += entry.tags.map(t => `- ${t}`).join('\n') + '\n';
  }
  
  if (entry.storedPath) {
    content += `\n**Stored:** \`${entry.storedPath}\`\n`;
  }
  
  return content;
}
```

### Unit Tests Updates: src/vault/interaction-log.test.ts
Add test cases:
- Format clarification request entry
- Format clarification response entry
- Format timeout entry
- Handle all optional fields

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, interaction log tests pass
3. Send ambiguous message → log shows clarification requested
4. Respond to clarification → log shows response and final categorization
5. Let clarification timeout → log shows timeout entry
