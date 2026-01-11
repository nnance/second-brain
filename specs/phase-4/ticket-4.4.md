# Ticket 4.4: Implement Response Detection (New vs Clarification)

## Description
When a message arrives from a sender with a pending clarification, determine if the message is a response to the clarification or a completely new/unrelated input. Use Claude to make this determination.

## Acceptance Criteria
- [ ] Response detector module exists at `src/ai/response-detector.ts`
- [ ] Uses Claude to classify incoming message as "response" or "new"
- [ ] Considers the original input and clarification question for context
- [ ] Returns classification with confidence
- [ ] If "new", the pending clarification is handled separately (e.g., timeout or cancel)
- [ ] Unit tests verify response parsing

## Technical Notes

### Decision Flow
```
Message received from sender with pending clarification
    │
    ▼
Is this a response to clarification or new input?
    │
    ├── Response ──▶ Use response to finalize original item
    │
    └── New ──▶ Process new message separately
               └── Original clarification: start timeout or cancel
```

### src/ai/response-detector.ts
```typescript
import { chat } from './client.js';
import { PendingClarification } from '../state/pending-clarifications.js';
import logger from '../logger.js';

export type ResponseType = 'response' | 'new';

export interface ResponseDetectionResult {
  type: ResponseType;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are determining if an incoming message is a response to a clarification question or a completely new/unrelated input.

Context:
- The user previously sent a message that was ambiguous
- The system asked a clarification question
- Now the user has sent another message

Your job: Is this new message answering the clarification question, or is it a completely new/unrelated thought?

SIGNALS FOR "response":
- Directly answers the question asked
- References options given
- Short replies like "the first one", "yes", "task", "link"
- Continues the same topic

SIGNALS FOR "new":
- Completely different topic
- New task/idea/reference unrelated to original
- Ignores the question entirely
- Starts with "also", "btw", "new thing"

Respond with JSON only:
{
  "type": "response|new",
  "confidence": <0-100>,
  "reasoning": "<brief explanation>"
}`;

export async function detectResponseType(
  newMessage: string,
  pending: PendingClarification
): Promise<ResponseDetectionResult> {
  logger.debug({ 
    newMessageLength: newMessage.length,
    originalInputLength: pending.originalInput.length 
  }, 'Detecting response type');
  
  const prompt = `ORIGINAL INPUT:
"${pending.originalInput}"

CLARIFICATION QUESTION:
"${pending.clarificationQuestion}"

NEW MESSAGE:
"${newMessage}"

Is the new message a response to the clarification, or a completely new input?`;

  const response = await chat(
    [{ role: 'user', content: prompt }],
    { systemPrompt: SYSTEM_PROMPT }
  );
  
  const result = parseDetectionResponse(response);
  
  logger.info({ 
    type: result.type, 
    confidence: result.confidence 
  }, 'Response type detected');
  
  return result;
}

function parseDetectionResponse(response: string): ResponseDetectionResult {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Default to treating as response if parsing fails
    return {
      type: 'response',
      confidence: 50,
      reasoning: 'Parse failed, defaulting to response',
    };
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  const type: ResponseType = parsed.type === 'new' ? 'new' : 'response';
  
  return {
    type,
    confidence: Number(parsed.confidence) || 50,
    reasoning: parsed.reasoning || '',
  };
}
```

### Example Scenarios

**Scenario 1: Clarification response**
- Original: "interesting article about zero-trust"
- Question: "Is this a link to save or a concept to research?"
- New message: "link to save"
- Result: `{ type: "response", confidence: 95 }`

**Scenario 2: New input**
- Original: "interesting article about zero-trust"
- Question: "Is this a link to save or a concept to research?"
- New message: "remind me to call mom tomorrow"
- Result: `{ type: "new", confidence: 92 }`

**Scenario 3: Ambiguous**
- Original: "interesting article about zero-trust"
- Question: "Is this a link to save or a concept to research?"
- New message: "actually both"
- Result: `{ type: "response", confidence: 70 }`

### Unit Tests: src/ai/response-detector.test.ts
Test cases:
- `parseDetectionResponse` handles valid response
- `parseDetectionResponse` handles valid new
- `parseDetectionResponse` defaults to response on parse failure
- `parseDetectionResponse` handles missing confidence

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, response detector tests pass
3. File `src/ai/response-detector.ts` exists
4. Tests exist in `src/ai/response-detector.test.ts`
