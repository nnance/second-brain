# Ticket 1.1: Create FileSessionStore Class

## Description

Create a new `FileSessionStore` class that implements the existing session store interface but persists sessions to a JSON file instead of keeping them only in memory.

## Acceptance Criteria

- [ ] `FileSessionStore` class created in `src/sessions/file-store.ts`
- [ ] Implements same interface as existing in-memory store
- [ ] Sessions stored as JSON in `$SECOND_BRAIN_DATA_DIR/sessions.json`
- [ ] Default data directory is `~/.second-brain/`
- [ ] Data directory created automatically if it doesn't exist
- [ ] Sessions loaded from file on instantiation

## Technical Notes

```typescript
// src/sessions/file-store.ts
import { Session } from './types';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export class FileSessionStore {
  private sessions: Map<string, Session>;
  private filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? process.env.SECOND_BRAIN_DATA_DIR ?? join(homedir(), '.second-brain');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.filePath = join(dir, 'sessions.json');
    this.sessions = this.load();
  }

  private load(): Map<string, Session> {
    // Load from file if exists, otherwise empty map
  }

  private save(): void {
    // Write sessions map to JSON file
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  set(id: string, session: Session): void {
    this.sessions.set(id, session);
    this.save();
  }

  delete(id: string): boolean {
    const result = this.sessions.delete(id);
    this.save();
    return result;
  }

  // ... other methods matching existing interface
}
```

Reference existing store: `src/sessions/store.ts`

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes (new tests in ticket 1.3)
3. `npm run lint` passes
4. File can be imported and instantiated
