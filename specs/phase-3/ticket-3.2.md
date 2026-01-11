# Ticket 3.2: Implement Category Analysis

## Description
Create a categorization module that uses Claude to analyze input text and determine which category it belongs to. Returns a structured result with category, confidence score, and reasoning.

## Acceptance Criteria
- [ ] Categorizer module exists at `src/ai/categorizer.ts`
- [ ] Analyzes input and returns one of: Tasks, Ideas, Reference, Projects, Inbox
- [ ] Returns confidence score (0-100)
- [ ] Returns reasoning explanation
- [ ] Uses structured output (JSON) from Claude
- [ ] System prompt clearly defines each category
- [ ] Unit tests verify response parsing

## Technical Notes

### Categories (Fixed Set)
| Category | Description |
|----------|-------------|
| `Tasks` | Actionable items—things to do or follow up on |
| `Ideas` | Thoughts, concepts, things to explore or develop |
| `Reference` | Information to retrieve later—links, articles, facts |
| `Projects` | Items related to longer-running initiatives |
| `Inbox` | Unclear or doesn't fit other categories |

### src/ai/categorizer.ts
```typescript
import { chat } from './client.js';
import logger from '../logger.js';

export type Category = 'Tasks' | 'Ideas' | 'Reference' | 'Projects' | 'Inbox';

export interface CategorizationResult {
  category: Category;
  confidence: number;
  reasoning: string;
  suggestedTitle: string;
}

const SYSTEM_PROMPT = `You are a categorization assistant for a personal knowledge capture system.

Analyze the input and categorize it into ONE of these categories:
- Tasks: Actionable items, things to do, follow-ups, reminders
- Ideas: Thoughts, concepts, things to explore or develop, creative sparks
- Reference: Information to save for later—links, articles, facts, quotes
- Projects: Items clearly related to longer-running initiatives or multi-step efforts
- Inbox: When genuinely unclear or doesn't fit other categories

Respond with JSON only:
{
  "category": "Tasks|Ideas|Reference|Projects|Inbox",
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "suggestedTitle": "<concise title for the note>"
}

Be decisive. Only use Inbox if truly ambiguous. Confidence should reflect how clearly the input matches the category.`;

export async function categorize(input: string): Promise<CategorizationResult> {
  logger.debug({ inputLength: input.length }, 'Categorizing input');
  
  const response = await chat(
    [{ role: 'user', content: input }],
    { systemPrompt: SYSTEM_PROMPT }
  );
  
  const result = parseCategorizationResponse(response);
  
  logger.info({
    category: result.category,
    confidence: result.confidence,
  }, 'Categorization complete');
  
  return result;
}

function parseCategorizationResponse(response: string): CategorizationResult {
  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in categorization response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate category
  const validCategories: Category[] = ['Tasks', 'Ideas', 'Reference', 'Projects', 'Inbox'];
  if (!validCategories.includes(parsed.category)) {
    throw new Error(`Invalid category: ${parsed.category}`);
  }
  
  // Validate confidence
  const confidence = Number(parsed.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 100) {
    throw new Error(`Invalid confidence: ${parsed.confidence}`);
  }
  
  return {
    category: parsed.category,
    confidence,
    reasoning: parsed.reasoning || '',
    suggestedTitle: parsed.suggestedTitle || '',
  };
}
```

### Example Inputs/Outputs
Input: "remind me to follow up with Sarah about the security audit"
```json
{
  "category": "Tasks",
  "confidence": 95,
  "reasoning": "Clear action verb 'remind', specific person and topic",
  "suggestedTitle": "Follow up with Sarah about security audit"
}
```

Input: "what if we used a graph database for the knowledge system"
```json
{
  "category": "Ideas",
  "confidence": 88,
  "reasoning": "Exploratory 'what if' framing, conceptual suggestion",
  "suggestedTitle": "Graph database for knowledge system"
}
```

### Unit Tests: src/ai/categorizer.test.ts
Test cases:
- `parseCategorizationResponse` handles valid JSON
- `parseCategorizationResponse` handles JSON in code blocks
- `parseCategorizationResponse` throws on invalid category
- `parseCategorizationResponse` throws on missing JSON

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, categorizer tests pass
3. File `src/ai/categorizer.ts` exists
4. Tests exist in `src/ai/categorizer.test.ts`
