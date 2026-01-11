# Phase 5: Conversation Management + Polish

## Checkpoint
Multi-turn clarification works: ambiguous text → agent asks question → user responds → agent stores with clarification context. Timeout handling works: pending clarifications expire and get stored to Inbox. System handles errors gracefully.

## Tickets
| Ticket | Description |
|--------|-------------|
| 5.1 | Conversation context management |
| 5.2 | Session timeout handling |
| 5.3 | Error handling + retries |
| 5.4 | End-to-end integration tests |

## Environment Requirements
- All previous environment variables
- `SESSION_TIMEOUT_MS` environment variable (optional, default 3600000 = 1 hour)

## Architecture

### Conversation State
```
┌─────────────────────────────────────────────────────┐
│                 Session Store                       │
│                                                     │
│  Map<senderId, Session>                             │
│                                                     │
│  Session {                                          │
│    history: MessageParam[]   // Conversation so far │
│    lastActivity: Date        // For timeout check   │
│    pendingInput?: string     // Original message    │
│  }                                                  │
└─────────────────────────────────────────────────────┘
```

### Multi-Turn Flow
```
User: "zero trust architecture"
    │
    ▼
Agent asks: "Is this a link to save or a topic to research?"
    │ (session stored with history + pending input)
    │
User: "link to save"
    │
    ▼
Agent receives clarification with conversation history
    │
    ▼
Agent stores to Reference/ with context
```

### Timeout Flow
```
User: "zero trust architecture"
    │
    ▼
Agent asks clarification question
    │ (session stored)
    │
    ... 1 hour passes ...
    │
    ▼
Timeout check triggers
    │
    ▼
Agent stores to Inbox/ with "timed out" note
```

## Key Design Decisions

### Agent Still Decides Everything
The conversation management is infrastructure only:
- Code stores history and manages timeouts
- Agent receives history and makes decisions
- No coded logic about WHEN to clarify

### Session Expiration
When a session times out:
1. Inject a synthetic "timeout" message into conversation
2. Run agent with instruction to store to Inbox
3. Clean up session

### Concurrent Sessions
Each sender has their own session. Multiple users can have pending clarifications simultaneously.

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. Multi-turn clarification works end-to-end
4. New message from same sender continues conversation
5. New message from different sender starts fresh
6. Timeout stores to Inbox with appropriate log entry
7. Agent errors don't crash the system
8. All integration tests pass
