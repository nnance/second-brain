# Ticket 6.1: Implement `npm run status` Command

## Description

Create a CLI command that checks and displays the service status, useful for debugging headless background services.

## Acceptance Criteria

- [ ] Script created: `scripts/status.ts`
- [ ] Shows running/stopped status
- [ ] Shows PID when running
- [ ] Shows uptime when running
- [ ] Exit code 0 if running, 1 if stopped
- [ ] `--json` flag for machine-readable output
- [ ] `npm run status` command added to package.json

## Technical Notes

```typescript
// scripts/status.ts
import { execSync } from 'child_process';

interface ServiceStatus {
  running: boolean;
  pid?: number;
  label: string;
  uptime?: string;
}

function getServiceStatus(): ServiceStatus {
  const label = 'com.second-brain.agent';
  const status: ServiceStatus = { running: false, label };

  try {
    // Check launchctl list for our service
    const output = execSync(`launchctl list | grep ${label}`, {
      encoding: 'utf-8',
    });

    // Output format: PID Status Label
    // e.g., "1234  0  com.second-brain.agent"
    const parts = output.trim().split(/\s+/);
    const pid = parseInt(parts[0]);

    if (!isNaN(pid) && pid > 0) {
      status.running = true;
      status.pid = pid;

      // Get process start time for uptime
      try {
        const psOutput = execSync(`ps -p ${pid} -o etime=`, {
          encoding: 'utf-8',
        });
        status.uptime = psOutput.trim();
      } catch {
        // Process might have just started
      }
    }
  } catch {
    // Service not found in launchctl list
  }

  return status;
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const status = getServiceStatus();

  if (jsonOutput) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    if (status.running) {
      console.log(`Status: Running`);
      console.log(`PID: ${status.pid}`);
      if (status.uptime) {
        console.log(`Uptime: ${status.uptime}`);
      }
    } else {
      console.log(`Status: Stopped`);
    }
  }

  process.exit(status.running ? 0 : 1);
}

main();
```

Add to `package.json`:

```json
{
  "scripts": {
    "status": "tsx scripts/status.ts"
  }
}
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm run lint` passes
3. Manual test (running): `npm run status` shows running, PID, uptime
4. Manual test (stopped): `npm run status` shows stopped, exit code 1
5. Manual test: `npm run status --json` outputs valid JSON
