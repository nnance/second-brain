# Ticket 4.3: Implement Clarification Question Generation

## Description
Create a module that generates contextual clarification questions when categorization confidence is low. Questions should be specific to the ambiguity, not generic.

## Acceptance Criteria
- [ ] Clarifier module exists at `src/ai/clarifier.ts`
- [ ] Uses Claude to generate targeted clarification question
- [ ] Question references the specific ambiguity (from reasoning)
- [ ] Question offers concrete options when possible
- [ ] Question is concise (appropriate for iMessage)
- [ ] Unit tests verify response parsing

## Technical Notes

### Clarification Style (from design doc)
Rather than generic questions, ask targeted ones:
- "Is this a link to save, a concept to research, or a thought to capture?"
- "Should this be tracked as a task or just stored as a reference?"
- "Is this related to the security-audit project or something new?"

### src/ai/clarifier.ts
```typescript
import { chat } from './client.js';
import { AnalysisResult } from './analyzer.js';
import logger from '../logger.js';

export interface ClarificationResult {
  question: string;
  options: string[];  // Suggested responses
}

const SYSTEM_PROMPT = `You are a clarification assistant for a personal knowledge capture system.

The system is uncertain about how to categorize an input. Generate a brief, targeted clarification question.

GUIDELINES:
1. Reference the specific ambiguity—don't ask generic questions
2. Offer 2-4 concrete options when possible
3. Keep it short—this will be sent via text message
4. Be conversational, not robotic

CATEGORIES:
- Tasks: Things to do, follow-ups, reminders
- Ideas: Thoughts to explore, concepts to develop
- Reference: Information to save—links, facts, articles
- Projects: Related to longer-running initiatives

Respond with JSON only:
{
  "question": "<your clarification question>",
  "options": ["option1", "option2", ...]
}`;

export async function generateClarificationQuestion(
  input: string,
  analysis: AnalysisResult
): Promise<ClarificationResult> {
  logger.debug({ 
    confidence: analysis.confidence,
    reasoning: analysis.reasoning 
  }, 'Generating clarification question');
  
  const prompt = `ORIGINAL INPUT:
"${input}"

CURRENT ANALYSIS:
- Best guess category: ${analysis.category}
- Confidence: ${analysis.confidence}%
- Uncertainty reason: ${analysis.reasoning}

Generate a clarification question to resolve the uncertainty.`;

  const response = await chat(
    [{ role: 'user', content: prompt }],
    { systemPrompt: SYSTEM_PROMPT }
  );
  
  const result = parseClarificationResponse(response);
  
  logger.info({ question: result.question }, 'Clarification question generated');
  
  return result;
}

function parseClarificationResponse(response: string): ClarificationResult {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in clarification response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    question: parsed.question || 'Could you clarify what you want to do with this?',
    options: Array.isArray(parsed.options) ? parsed.options : [],
  };
}

// Format question for sending via iMessage
export function formatClarificationMessage(result: ClarificationResult): string {
  let message = result.question;
  
  if (result.options.length > 0) {
    message += '\n\nOptions: ' + result.options.join(', ');
  }
  
  return message;
}
```

### Example Input/Output

Input: "interesting article about zero-trust architecture"
Analysis: `{ category: "Reference", confidence: 58, reasoning: "Topic clear, but unclear if link, note, or research item" }`

Generated:
```json
{
  "question": "Is this a link you want me to save, a concept to research later, or a thought you want to capture?",
  "options": ["link to save", "research topic", "thought to capture"]
}
```

### Unit Tests: src/ai/clarifier.test.ts
Test cases:
- `parseClarificationResponse` handles valid JSON
- `parseClarificationResponse` provides default question on missing field
- `formatClarificationMessage` includes options when present
- `formatClarificationMessage` omits options section when empty

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, clarifier tests pass
3. File `src/ai/clarifier.ts` exists
4. Tests exist in `src/ai/clarifier.test.ts`
