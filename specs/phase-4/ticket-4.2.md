# Ticket 4.2: Implement Conversation State Management

## Description
Create a module to track pending clarifications. When Claude asks a clarifying question, the state manager holds the original input and analysis until a response is received or timeout occurs.

## Acceptance Criteria
- [ ] State manager module exists at `src/state/pending-clarifications.ts`
- [ ] Can store pending clarification with original input, analysis, and timestamp
- [ ] Can retrieve pending clarification by sender ID
- [ ] Can clear/resolve pending clarification
- [ ] Single pending clarification per sender (new one replaces old)
- [ ] Exposes list of all pending clarifications (for timeout checking)
- [ ] Unit tests verify state operations

## Technical Notes

### Why Sender-Based State
Each sender (phone number) can have at most one pending clarification. If they send multiple messages, we need to decide how to handle them (addressed in ticket 4.4).

### src/state/pending-clarifications.ts
```typescript
import { AnalysisResult } from '../ai/analyzer.js';
import logger from '../logger.js';

export interface PendingClarification {
  senderId: string;
  originalInput: string;
  analysis: AnalysisResult;
  clarificationQuestion: string;
  createdAt: Date;
}

// In-memory store (single process, no persistence needed)
const pendingClarifications = new Map<string, PendingClarification>();

export function setPendingClarification(clarification: PendingClarification): void {
  const existing = pendingClarifications.get(clarification.senderId);
  if (existing) {
    logger.warn({ senderId: clarification.senderId }, 'Replacing existing pending clarification');
  }
  
  pendingClarifications.set(clarification.senderId, clarification);
  logger.debug({ senderId: clarification.senderId }, 'Pending clarification stored');
}

export function getPendingClarification(senderId: string): PendingClarification | undefined {
  return pendingClarifications.get(senderId);
}

export function hasPendingClarification(senderId: string): boolean {
  return pendingClarifications.has(senderId);
}

export function clearPendingClarification(senderId: string): boolean {
  const existed = pendingClarifications.delete(senderId);
  if (existed) {
    logger.debug({ senderId }, 'Pending clarification cleared');
  }
  return existed;
}

export function getAllPendingClarifications(): PendingClarification[] {
  return Array.from(pendingClarifications.values());
}

export function getPendingClarificationCount(): number {
  return pendingClarifications.size;
}

// For testing
export function clearAllPendingClarifications(): void {
  pendingClarifications.clear();
  logger.debug('All pending clarifications cleared');
}
```

### State Structure
```typescript
{
  senderId: "+15551234567",
  originalInput: "interesting article about zero-trust",
  analysis: { /* AnalysisResult from ticket 3.6 */ },
  clarificationQuestion: "Is this a link to save or a concept to research?",
  createdAt: Date
}
```

### Memory Considerations
- In-memory storage is appropriate here since:
  - Pending clarifications are short-lived
  - Process restart clears state (acceptable for MVP)
  - Volume is low (personal use)

### Unit Tests: src/state/pending-clarifications.test.ts
Test cases:
- `setPendingClarification` stores clarification
- `getPendingClarification` retrieves by sender
- `getPendingClarification` returns undefined for unknown sender
- `hasPendingClarification` returns correct boolean
- `clearPendingClarification` removes clarification
- `getAllPendingClarifications` returns all pending
- Setting new clarification for same sender replaces old one

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, state tests pass
3. File `src/state/pending-clarifications.ts` exists
4. Tests exist in `src/state/pending-clarifications.test.ts`
