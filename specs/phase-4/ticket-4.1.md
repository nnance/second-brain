# Ticket 4.1: Implement Confidence Threshold Check

## Description
Add logic to check if categorization confidence meets the threshold. If below threshold, the system should trigger the clarification flow instead of storing directly.

## Acceptance Criteria
- [ ] Confidence threshold configurable via `CONFIDENCE_THRESHOLD` env var
- [ ] Default threshold is 70
- [ ] `shouldClarify()` function returns true when confidence below threshold
- [ ] Message handler branches based on confidence check
- [ ] Config module updated with new variable
- [ ] Unit tests verify threshold logic

## Technical Notes

### Environment Variable
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONFIDENCE_THRESHOLD` | No | `70` | Minimum confidence to store without clarification |

### src/config.ts Update
```typescript
confidenceThreshold: number;

// In loadConfig():
confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD) || 70,
```

### src/ai/analyzer.ts Update
```typescript
import { config } from '../config.js';

export function shouldClarify(confidence: number): boolean {
  return confidence < config.confidenceThreshold;
}
```

### Updated Message Flow
```
Input received
    │
    ▼
Analyze input
    │
    ▼
Confidence >= threshold? ──Yes──▶ Store directly
    │
    No
    │
    ▼
Trigger clarification flow (Phase 4.2+)
```

### src/index.ts Update (structure only)
```typescript
const analysis = await analyzeInput(message.text);

if (shouldClarify(analysis.confidence)) {
  // TODO: Clarification flow (tickets 4.2-4.5)
  logger.info({ confidence: analysis.confidence }, 'Confidence below threshold, clarification needed');
} else {
  // Existing direct storage flow
  const result = await writeNote({ ... });
  await writeInteractionLog({ ... });
}
```

### .env.example Update
```bash
# Optional: Minimum confidence to store without clarification (default: 70)
CONFIDENCE_THRESHOLD=70
```

### Unit Tests: src/ai/analyzer.test.ts
Test cases:
- `shouldClarify` returns true when below threshold
- `shouldClarify` returns false when at threshold
- `shouldClarify` returns false when above threshold

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. `shouldClarify(60)` returns true with default threshold
4. `shouldClarify(70)` returns false with default threshold
5. `CONFIDENCE_THRESHOLD=50` makes `shouldClarify(60)` return false
