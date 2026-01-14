# Ticket 5.2: Implement Auto-Pull and Rebuild Logic

## Description

When new commits are detected, pull the changes and rebuild if necessary.

## Acceptance Criteria

- [ ] `pullAndRebuild()` function in `src/git/updater.ts`
- [ ] Runs `git pull origin main`
- [ ] Runs `npm install` if `package.json` changed
- [ ] Runs `npm run build` if source files changed
- [ ] Returns success/failure status
- [ ] Logs each step of the process

## Technical Notes

```typescript
// src/git/updater.ts
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger';

const execFileAsync = promisify(execFile);

export interface UpdateResult {
  success: boolean;
  pulled: boolean;
  installed: boolean;
  built: boolean;
  error?: Error;
}

export async function pullAndRebuild(): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    pulled: false,
    installed: false,
    built: false,
  };

  try {
    // Get list of changed files before pull
    const { stdout: diffOutput } = await execFileAsync('git', [
      'diff',
      '--name-only',
      'HEAD',
      'origin/main',
    ]);
    const changedFiles = diffOutput.trim().split('\n').filter(Boolean);

    // Pull changes
    logger.info('Pulling changes from origin/main');
    await execFileAsync('git', ['pull', 'origin', 'main']);
    result.pulled = true;

    // Check if package.json changed
    const packageChanged = changedFiles.some(f => f === 'package.json' || f === 'package-lock.json');
    if (packageChanged) {
      logger.info('package.json changed, running npm install');
      await execFileAsync('npm', ['install']);
      result.installed = true;
    }

    // Check if source files changed
    const sourceChanged = changedFiles.some(f => f.startsWith('src/') || f === 'tsconfig.json');
    if (sourceChanged || packageChanged) {
      logger.info('Source files changed, running build');
      await execFileAsync('npm', ['run', 'build']);
      result.built = true;
    }

    result.success = true;
    logger.info({ result }, 'Update completed successfully');
  } catch (err) {
    result.error = err as Error;
    logger.error({ err }, 'Update failed');
  }

  return result;
}
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: Make change, push, verify pull and rebuild
