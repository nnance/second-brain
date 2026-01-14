# Ticket 1.3: Set Up Node Native Test Runner

## Description
Configure the Node.js native test runner for unit testing. Create a basic test to verify the setup is working. Tests should be written in TypeScript and run via tsx.

## Acceptance Criteria
- [ ] Test script configured in `package.json`
- [ ] Tests located in `src/**/*.test.ts` pattern
- [ ] At least one passing test exists
- [ ] `npm test` runs all tests and exits 0
- [ ] Test output shows pass/fail status

## Technical Notes

### package.json scripts
```json
{
  "scripts": {
    "test": "node --import tsx --test src/**/*.test.ts"
  }
}
```

### Test File Location
Place tests alongside source files:
```
src/
├── logger.ts
├── logger.test.ts
└── index.ts
```

### Sample Test: src/logger.test.ts
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import logger from './logger.js';

describe('logger', () => {
  it('should be defined', () => {
    assert.ok(logger);
  });

  it('should have info method', () => {
    assert.strictEqual(typeof logger.info, 'function');
  });
});
```

### Node Version Note
Node native test runner is stable in Node 20+. Ensure the project documents this requirement.

## Done Conditions (for Claude Code to verify)
1. Run `npm test` — exits 0
2. Output contains "pass" or "✔" indicators
3. At least one test file exists matching `src/**/*.test.ts`
