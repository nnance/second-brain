# Ticket 3.5: Implement Priority Prediction

## Description
Extend the AI analysis to predict priority level for captured items. Priority is expressed as a tag following the established taxonomy.

## Acceptance Criteria
- [ ] Priority predictor module exists at `src/ai/priority.ts`
- [ ] Returns one of: `priority/urgent`, `priority/high`, `priority/normal`, `priority/low`, `priority/someday`
- [ ] Returns confidence score and reasoning
- [ ] System prompt explains priority levels
- [ ] Default to `priority/normal` if unclear
- [ ] Unit tests verify response parsing

## Technical Notes

### Priority Taxonomy (from design doc)
| Priority | Description |
|----------|-------------|
| `priority/urgent` | Needs attention now |
| `priority/high` | Important, do soon |
| `priority/normal` | Default, no special urgency |
| `priority/low` | Eventually, no pressure |
| `priority/someday` | Nice to do, no commitment |

### src/ai/priority.ts
```typescript
import { chat } from './client.js';
import logger from '../logger.js';

export type Priority = 
  | 'priority/urgent'
  | 'priority/high'
  | 'priority/normal'
  | 'priority/low'
  | 'priority/someday';

export interface PriorityResult {
  priority: Priority;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a priority assessment assistant for a personal knowledge capture system.

Assess the priority of the input based on these levels:

PRIORITY LEVELS:
- priority/urgent — Needs attention NOW. Time-sensitive, critical deadlines, emergencies.
- priority/high — Important, should do soon. Clear deadlines within days, significant impact.
- priority/normal — Default. Regular tasks and items with no special urgency.
- priority/low — Eventually. Nice to do but no pressure. Can wait indefinitely.
- priority/someday — Aspirational. No commitment, just capturing for future consideration.

SIGNALS TO LOOK FOR:
- Explicit urgency words: "urgent", "ASAP", "immediately", "critical"
- Time references: "today", "tomorrow", "this week", "by Friday"
- Importance markers: "important", "must", "need to"
- Casual framing: "maybe", "someday", "might be nice", "just an idea"

When in doubt, default to priority/normal.

Respond with JSON only:
{
  "priority": "priority/...",
  "confidence": <0-100>,
  "reasoning": "<brief explanation>"
}`;

export async function predictPriority(input: string): Promise<PriorityResult> {
  logger.debug({ inputLength: input.length }, 'Predicting priority');
  
  const response = await chat(
    [{ role: 'user', content: input }],
    { systemPrompt: SYSTEM_PROMPT }
  );
  
  const result = parsePriorityResponse(response);
  
  logger.info({
    priority: result.priority,
    confidence: result.confidence,
  }, 'Priority prediction complete');
  
  return result;
}

function parsePriorityResponse(response: string): PriorityResult {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in priority response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  const validPriorities: Priority[] = [
    'priority/urgent',
    'priority/high',
    'priority/normal',
    'priority/low',
    'priority/someday',
  ];
  
  if (!validPriorities.includes(parsed.priority)) {
    logger.warn({ received: parsed.priority }, 'Invalid priority, defaulting to normal');
    return {
      priority: 'priority/normal',
      confidence: 50,
      reasoning: 'Default due to invalid response',
    };
  }
  
  return {
    priority: parsed.priority,
    confidence: Number(parsed.confidence) || 50,
    reasoning: parsed.reasoning || '',
  };
}
```

### Example Input/Output

Input: "urgent: call the bank about the fraud charge today"
```json
{
  "priority": "priority/urgent",
  "confidence": 95,
  "reasoning": "Explicit 'urgent' marker, time-sensitive financial matter"
}
```

Input: "maybe look into that new note-taking app sometime"
```json
{
  "priority": "priority/someday",
  "confidence": 85,
  "reasoning": "Casual 'maybe' and 'sometime' framing indicates no commitment"
}
```

### Unit Tests: src/ai/priority.test.ts
Test cases:
- `parsePriorityResponse` handles valid priorities
- `parsePriorityResponse` defaults to normal on invalid priority
- `parsePriorityResponse` handles missing confidence

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, priority tests pass
3. File `src/ai/priority.ts` exists
4. Tests exist in `src/ai/priority.test.ts`
