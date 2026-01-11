# Ticket 3.4: Implement Tag Generation

## Description
Create a module that uses Claude to generate relevant tags for an input. Claude should prefer existing tags when they match, but can create new tags following the established taxonomy when needed.

## Acceptance Criteria
- [ ] Tagger module exists at `src/ai/tagger.ts`
- [ ] Receives input text and list of existing tags
- [ ] Returns array of tags (existing or new)
- [ ] New tags follow hierarchical format (e.g., `person/name`, `topic/subject`)
- [ ] System prompt explains taxonomy and encourages reuse
- [ ] Unit tests verify response parsing

## Technical Notes

### Tag Taxonomy (from design doc)
```
Entity Tags:
  person/{name}     — People
  project/{name}    — Projects
  topic/{name}      — Subject areas
  company/{name}    — Organizations

Status Tags:
  status/waiting    — Blocked on someone/something
  status/active     — In progress
  status/scheduled  — Has specific date/time
  status/done       — Completed
```

Note: Priority tags are handled in ticket 3.5.

### src/ai/tagger.ts
```typescript
import { chat } from './client.js';
import { getExistingTags } from '../vault/tags.js';
import logger from '../logger.js';

export interface TaggingResult {
  tags: string[];
  newTags: string[];  // Tags that didn't exist before
}

const SYSTEM_PROMPT = `You are a tagging assistant for a personal knowledge capture system.

Your job is to assign relevant tags to the input. Follow these rules:

TAG TAXONOMY:
- person/{name} — People mentioned (lowercase, hyphenated: person/sarah-connor)
- project/{name} — Projects mentioned (lowercase, hyphenated: project/security-audit)
- topic/{name} — Subject areas (lowercase, hyphenated: topic/machine-learning)
- company/{name} — Organizations (lowercase, hyphenated: company/anthropic)
- status/waiting|active|scheduled|done — Current status if clear

RULES:
1. REUSE existing tags when they match (check the provided list)
2. Only create new tags if no existing tag fits
3. New tags must follow the taxonomy format
4. Be conservative—only add tags that are clearly relevant
5. Typically assign 1-5 tags per item

Respond with JSON only:
{
  "tags": ["tag1", "tag2"],
  "reasoning": "<brief explanation>"
}`;

export async function generateTags(input: string): Promise<TaggingResult> {
  const existingTags = await getExistingTags();
  
  logger.debug({ 
    inputLength: input.length, 
    existingTagCount: existingTags.length 
  }, 'Generating tags');
  
  const prompt = `EXISTING TAGS:\n${existingTags.join('\n') || '(none yet)'}\n\nINPUT:\n${input}`;
  
  const response = await chat(
    [{ role: 'user', content: prompt }],
    { systemPrompt: SYSTEM_PROMPT }
  );
  
  const result = parseTaggingResponse(response, existingTags);
  
  logger.info({
    tagCount: result.tags.length,
    newTagCount: result.newTags.length,
  }, 'Tagging complete');
  
  return result;
}

function parseTaggingResponse(response: string, existingTags: string[]): TaggingResult {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in tagging response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  if (!Array.isArray(parsed.tags)) {
    throw new Error('Tags must be an array');
  }
  
  const tags: string[] = parsed.tags.map((t: unknown) => String(t).toLowerCase());
  const existingSet = new Set(existingTags.map(t => t.toLowerCase()));
  
  const newTags = tags.filter(t => !existingSet.has(t));
  
  return { tags, newTags };
}
```

### Example Input/Output
Input: "remind me to follow up with Sarah about the security audit"

Existing tags: ["person/john", "project/onboarding", "topic/security"]

Output:
```json
{
  "tags": ["person/sarah", "project/security-audit", "topic/security"],
  "newTags": ["person/sarah", "project/security-audit"]
}
```

Note: `topic/security` was reused from existing tags.

### Unit Tests: src/ai/tagger.test.ts
Test cases:
- `parseTaggingResponse` handles valid JSON
- `parseTaggingResponse` identifies new vs existing tags
- `parseTaggingResponse` handles empty tag list
- `parseTaggingResponse` lowercases all tags

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, tagger tests pass
3. File `src/ai/tagger.ts` exists
4. Tests exist in `src/ai/tagger.test.ts`
