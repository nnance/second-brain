# Phase 4: Clarification Flow + Confirmation Reply

## Checkpoint
Send an ambiguous text → Claude asks clarifying question → respond to clarification → file stored correctly → confirmation reply received. Also: timeout behavior works (item goes to Inbox after timeout).

## Tickets
| Ticket | Description |
|--------|-------------|
| 4.1 | Implement confidence threshold check |
| 4.2 | Implement conversation state management |
| 4.3 | Implement clarification question generation |
| 4.4 | Implement response detection (new vs clarification) |
| 4.5 | Implement clarification timeout |
| 4.6 | Implement confirmation reply |
| 4.7 | Update interaction log with clarification details |

## Environment Requirements
- `CONFIDENCE_THRESHOLD` environment variable (optional, default 70)
- `CLARIFICATION_TIMEOUT_MS` environment variable (optional, default 3600000 = 1 hour)

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. High-confidence input → stored directly + confirmation sent
4. Low-confidence input → clarification question sent
5. Respond to clarification → stored correctly + confirmation sent
6. New message while clarification pending → handled separately
7. Timeout reached → stored to Inbox + noted in log
