# Ticket 2.2: Create Vault Initialization Script

## Description
Create a script that initializes the Obsidian vault folder structure. This script should be idempotent (safe to run multiple times) and create all required directories.

## Acceptance Criteria
- [ ] Script exists at `src/scripts/init-vault.ts`
- [ ] `npm run vault:init` executes the script
- [ ] Creates all required folders if they don't exist
- [ ] Does not overwrite or delete existing content
- [ ] Logs each folder created/verified
- [ ] Uses `VAULT_PATH` from environment configuration

## Technical Notes

### Required Folder Structure
```
${VAULT_PATH}/
├── _system/
│   └── logs/
├── Tasks/
├── Ideas/
├── Reference/
├── Projects/
├── Inbox/
└── Archive/
```

### src/scripts/init-vault.ts
```typescript
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

const FOLDERS = [
  '_system/logs',
  'Tasks',
  'Ideas',
  'Reference',
  'Projects',
  'Inbox',
  'Archive',
];

async function initVault(): Promise<void> {
  logger.info({ vaultPath: config.vaultPath }, 'Initializing vault');
  
  for (const folder of FOLDERS) {
    const fullPath = join(config.vaultPath, folder);
    await mkdir(fullPath, { recursive: true });
    logger.info({ folder: fullPath }, 'Folder ready');
  }
  
  logger.info('Vault initialization complete');
}

initVault().catch((error) => {
  logger.fatal({ error }, 'Vault initialization failed');
  process.exit(1);
});
```

### package.json scripts
```json
{
  "scripts": {
    "vault:init": "tsx src/scripts/init-vault.ts"
  }
}
```

### Idempotency
- Use `mkdir` with `{ recursive: true }` — this succeeds even if folder exists
- Do not delete or modify any existing files

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `VAULT_PATH=/tmp/test-vault npm run vault:init` — exits 0
3. Verify folders exist: `ls /tmp/test-vault` shows all expected folders
4. Run `npm run vault:init` again — exits 0 (idempotent)
5. File `src/scripts/init-vault.ts` exists
