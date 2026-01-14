# Ticket 5.1: Conversation Context Management

## Description
Implement a session store that maintains conversation history per sender. This allows the agent to receive full context when a user responds to a clarification question, enabling natural multi-turn conversations.

## Acceptance Criteria
- [ ] Session store module exists at `src/sessions/store.ts`
- [ ] Sessions are keyed by sender ID
- [ ] Sessions store conversation history (MessageParam[])
- [ ] Sessions track last activity timestamp
- [ ] Sessions can be created, retrieved, updated, and deleted
- [ ] Agent runner receives conversation history from session
- [ ] After agent run, updated history is saved back to session
- [ ] Sessions are in-memory (no persistence required for MVP)
- [ ] Unit tests verify session operations

## Technical Notes

### Session Interface
```typescript
// src/sessions/store.ts
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export interface Session {
  senderId: string;
  history: MessageParam[];
  lastActivity: Date;
  pendingInput?: string;  // Original message if awaiting clarification
}

// In-memory store
const sessions = new Map<string, Session>();

export function getSession(senderId: string): Session | undefined {
  return sessions.get(senderId);
}

export function createSession(senderId: string): Session {
  const session: Session = {
    senderId,
    history: [],
    lastActivity: new Date(),
  };
  sessions.set(senderId, session);
  return session;
}

export function updateSession(senderId: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(senderId);
  if (!session) return undefined;

  const updated = {
    ...session,
    ...updates,
    lastActivity: new Date(),
  };
  sessions.set(senderId, updated);
  return updated;
}

export function deleteSession(senderId: string): boolean {
  return sessions.delete(senderId);
}

export function getOrCreateSession(senderId: string): Session {
  return getSession(senderId) ?? createSession(senderId);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}
```

### Updated Message Handler
```typescript
// In src/index.ts or new message handler module

import { getOrCreateSession, updateSession, deleteSession } from './sessions/store.js';
import { runAgent } from './agent/runner.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

async function handleMessage(text: string, sender: string) {
  // Get or create session
  const session = getOrCreateSession(sender);

  // Run agent with conversation history
  const result = await runAgent(text, { recipient: sender }, session.history);

  if (result.success) {
    // Agent completed - check if it asked a clarification or completed storage
    // We can infer this from tool calls: if send_message but no vault_write, likely clarifying
    const askedClarification = result.toolsCalled.includes('send_message') &&
                               !result.toolsCalled.includes('vault_write');

    if (askedClarification) {
      // Save conversation history for next message
      updateSession(sender, {
        history: buildUpdatedHistory(session.history, text, result),
        pendingInput: session.pendingInput ?? text,
      });
    } else {
      // Completed - clear session
      deleteSession(sender);
    }
  } else {
    // Error - keep session for retry? Or clear? Let's clear for now.
    deleteSession(sender);
  }
}
```

### Building Conversation History
After each agent run, we need to reconstruct the conversation history:
```typescript
function buildUpdatedHistory(
  existingHistory: MessageParam[],
  userMessage: string,
  agentResult: AgentResult
): MessageParam[] {
  // The agent runner handles this internally during the loop
  // We need to extract the final history from the runner
  // Consider returning full history from runAgent
}
```

### Updated Agent Runner Interface
The agent runner should return the conversation history:
```typescript
export interface AgentResult {
  success: boolean;
  toolsCalled: string[];
  history: MessageParam[];  // Add this
  error?: string;
}
```

### Unit Tests: src/sessions/store.test.ts
Test cases:
- createSession creates with empty history
- getSession returns undefined for unknown sender
- getOrCreateSession creates if not exists
- getOrCreateSession returns existing if exists
- updateSession updates fields and timestamp
- deleteSession removes session
- Sessions are isolated by sender ID

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, session store tests pass
3. File `src/sessions/store.ts` exists
4. Tests exist in `src/sessions/store.test.ts`
5. Agent runner returns conversation history
6. Message handler uses sessions to maintain context
