# Ticket 4.3: Document Service Management Commands

## Description

Create documentation explaining how to install, manage, and troubleshoot the background service.

## Acceptance Criteria

- [ ] Documentation created: `docs/SERVICE.md`
- [ ] Prerequisites section (env vars, permissions)
- [ ] Installation instructions
- [ ] All management commands documented
- [ ] Troubleshooting section
- [ ] Log file locations documented

## Technical Notes

Create `docs/SERVICE.md`:

```markdown
# Second Brain Background Service

## Prerequisites

Before installing the service, ensure these environment variables are set in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export VAULT_PATH="/path/to/your/obsidian/vault"
export ANTHROPIC_API_KEY="your-api-key"
```

## Installation

1. Build the project:
   ```bash
   npm run build
   ```

2. Install the service:
   ```bash
   npm run service:install
   ```

The service will start immediately and automatically on future logins.

## Management Commands

| Command | Description |
|---------|-------------|
| `npm run service:install` | Install and start the service |
| `npm run service:uninstall` | Stop and remove the service |
| `npm run service:start` | Start the service |
| `npm run service:stop` | Stop the service |
| `npm run service:restart` | Restart the service |
| `npm run status` | Check service status |

## Log Files

Logs are stored in `~/Library/Logs/second-brain/`:

- `stdout.log` - Standard output from the process
- `stderr.log` - Standard error from the process
- `second-brain-YYYY-MM-DD.log` - Application logs

View recent logs:
```bash
tail -f ~/Library/Logs/second-brain/stdout.log
```

## Troubleshooting

### Service won't start

1. Check if environment variables are set in the plist:
   ```bash
   cat ~/Library/LaunchAgents/com.second-brain.agent.plist
   ```

2. Check launchd logs:
   ```bash
   log show --predicate 'subsystem == "com.apple.launchd"' --last 5m
   ```

### Service keeps restarting

Check stderr.log for crash reasons:
```bash
cat ~/Library/Logs/second-brain/stderr.log
```

### Reinstalling after code changes

```bash
npm run build
npm run service:restart
```

## Uninstalling

```bash
npm run service:uninstall
```

This stops the service and removes the launchd configuration.
```

## Done Conditions

1. Documentation file created
2. All commands accurate and tested
3. Troubleshooting section covers common issues
4. Documentation reviewed for clarity
