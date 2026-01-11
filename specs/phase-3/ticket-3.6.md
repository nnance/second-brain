# Ticket 3.6: Route Files to Correct Folder

## Description
Update the capture pipeline to use Claude's categorization to route files to the correct folder. Integrate categorization, tagging, and priority prediction into a single analysis step, then write to the appropriate folder with complete metadata.

## Acceptance Criteria
- [ ] Analyzer module exists at `src/ai/analyzer.ts` that combines all analysis
- [ ] Files are written to the folder matching the category (Tasks, Ideas, etc.)
- [ ] Frontmatter includes all tags (entity + priority)
- [ ] Frontmatter includes confidence score
- [ ] Suggested title from Claude is used for filename and note heading
- [ ] Message handler updated to use full analysis pipeline

## Technical Notes

### Combined Analysis Flow
```
Input
  │
  ├─▶ Categorize (category, confidence, reasoning, title)
  │
  ├─▶ Generate Tags (entity tags)
  │
  └─▶ Predict Priority (priority tag)
  │
  ▼
Combined Result
  │
  ▼
Write to {category}/ folder with all metadata
```

### src/ai/analyzer.ts
```typescript
import { categorize, CategorizationResult, Category } from './categorizer.js';
import { generateTags, TaggingResult } from './tagger.js';
import { predictPriority, PriorityResult } from './priority.js';
import logger from '../logger.js';

export interface AnalysisResult {
  category: Category;
  confidence: number;
  reasoning: string;
  suggestedTitle: string;
  tags: string[];
  priority: string;
  priorityConfidence: number;
}

export async function analyzeInput(input: string): Promise<AnalysisResult> {
  logger.info({ inputLength: input.length }, 'Starting full analysis');
  
  // Run analyses (could be parallelized, but sequential is simpler)
  const [categorizationResult, taggingResult, priorityResult] = await Promise.all([
    categorize(input),
    generateTags(input),
    predictPriority(input),
  ]);
  
  // Combine tags with priority
  const allTags = [...taggingResult.tags, priorityResult.priority];
  
  logger.info({
    category: categorizationResult.category,
    confidence: categorizationResult.confidence,
    tagCount: allTags.length,
    priority: priorityResult.priority,
  }, 'Analysis complete');
  
  return {
    category: categorizationResult.category,
    confidence: categorizationResult.confidence,
    reasoning: categorizationResult.reasoning,
    suggestedTitle: categorizationResult.suggestedTitle,
    tags: allTags,
    priority: priorityResult.priority,
    priorityConfidence: priorityResult.confidence,
  };
}
```

### Updated Message Handler (src/index.ts)
```typescript
import { analyzeInput } from './ai/analyzer.js';
import { writeNote } from './vault/writer.js';
import { writeInteractionLog } from './vault/interaction-log.js';

// In onMessage handler:
const analysis = await analyzeInput(message.text);

const result = await writeNote({
  folder: analysis.category,  // Now uses categorized folder
  title: analysis.suggestedTitle || message.text.slice(0, 50),
  body: message.text,
  metadata: {
    created: timestamp,
    source: 'imessage',
    confidence: analysis.confidence,
    tags: analysis.tags,
  },
});
```

### Updated Frontmatter Format
```yaml
---
created: 2026-01-10T14:32:00Z
source: imessage
confidence: 92
tags:
  - person/sarah
  - project/security-audit
  - topic/security
  - priority/high
---
```

### Update vault/writer.ts
Update `NoteMetadata` interface to accept `tags` as `string[]` and format them in YAML list format.

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. File `src/ai/analyzer.ts` exists
4. Send test message about a task → file appears in `Tasks/` folder
5. Send test message about an idea → file appears in `Ideas/` folder
6. Frontmatter contains confidence score and tags
