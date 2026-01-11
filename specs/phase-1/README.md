# Phase 1: Project Setup + iMessage Listener

## Checkpoint
Send a text to the dedicated iMessage account → see it logged to console with structured Pino output.

## Tickets
| Ticket | Description |
|--------|-------------|
| 1.1 | Initialize TypeScript project |
| 1.2 | Configure Pino structured logging |
| 1.3 | Set up Node native test runner |
| 1.4 | Implement iMessage listener |

## Environment Requirements
- macOS with Messages.app signed into dedicated iMessage account
- Node.js (current LTS)

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. `npm start` launches the listener
4. Sending a text to the dedicated account produces structured log output to console
