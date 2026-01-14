# Second Brain Background Service

This document explains how to install, manage, and troubleshoot the Second Brain background service on macOS.

## Prerequisites

### Required Environment Variables

Before installing the service, ensure these environment variables are set in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export VAULT_PATH="/path/to/your/obsidian/vault"
export ANTHROPIC_API_KEY="your-api-key"
```

After adding these, reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### System Requirements

- macOS (launchd is macOS-only)
- Node.js 20+ installed
- Full Disk Access permission for Terminal (System Settings > Privacy & Security > Full Disk Access)

## Installation

1. **Build the project** (if not already built):

   ```bash
   npm run build
   ```

2. **Install the service**:

   ```bash
   npm run service:install
   ```

The service will start immediately and automatically on future logins.

## Management Commands

| Command | Description |
|---------|-------------|
| `npm run service:install` | Install and start the service |
| `npm run service:uninstall` | Stop and remove the service |
| `npm run service:status` | Check service status and recent logs |
| `npm run service:start` | Start the service |
| `npm run service:stop` | Stop the service |
| `npm run service:restart` | Restart the service |

## Log Files

Logs are stored in `~/Library/Logs/second-brain/`:

| File | Description |
|------|-------------|
| `stdout.log` | Standard output from the process |
| `stderr.log` | Standard error from the process |
| `second-brain.YYYY-MM-DD.log` | Application logs (rotated daily) |

### Viewing Logs

View recent logs:

```bash
# Application logs
tail -f ~/Library/Logs/second-brain/stdout.log

# Error logs
tail -f ~/Library/Logs/second-brain/stderr.log

# Combined view
tail -f ~/Library/Logs/second-brain/*.log
```

## Data Storage

Session data is stored in `~/.second-brain/`:

| File | Description |
|------|-------------|
| `sessions.json` | Active session state (survives restarts) |

## Troubleshooting

### Service won't start

1. **Check environment variables in the plist**:

   ```bash
   cat ~/Library/LaunchAgents/com.second-brain.agent.plist
   ```

   Verify `VAULT_PATH` and `ANTHROPIC_API_KEY` are set correctly.

2. **Check launchd logs**:

   ```bash
   log show --predicate 'subsystem == "com.apple.launchd"' --last 5m | grep second-brain
   ```

3. **Check stderr for errors**:

   ```bash
   cat ~/Library/Logs/second-brain/stderr.log
   ```

### Service keeps restarting

The service is configured with `KeepAlive: true`, which means it will restart if it crashes. Check stderr.log for crash reasons:

```bash
cat ~/Library/Logs/second-brain/stderr.log
```

Common causes:
- Missing or invalid `ANTHROPIC_API_KEY`
- Invalid `VAULT_PATH` (directory doesn't exist)
- Node.js version mismatch

### Permission errors

If you see permission errors:

1. Grant Full Disk Access to Terminal:
   - Open System Settings > Privacy & Security > Full Disk Access
   - Add Terminal (or your terminal app)

2. Reinstall the service:

   ```bash
   npm run service:uninstall
   npm run service:install
   ```

### Reinstalling after code changes

After pulling new code or making changes:

```bash
npm run build
npm run service:restart
```

Or for a full reinstall:

```bash
npm run service:uninstall
npm run service:install
```

## Uninstalling

To completely remove the service:

```bash
npm run service:uninstall
```

This stops the service and removes the launchd configuration. Log files and session data are preserved.

To also remove logs and data:

```bash
rm -rf ~/Library/Logs/second-brain
rm -rf ~/.second-brain
```

## How It Works

The service uses macOS launchd to:

1. **Start automatically on login** (`RunAtLoad: true`)
2. **Restart on crash** (`KeepAlive: true`)
3. **Throttle restarts** (minimum 10 seconds between restarts)

The plist configuration is stored at:
```
~/Library/LaunchAgents/com.second-brain.agent.plist
```

## Security Notes

- The `ANTHROPIC_API_KEY` is stored in the plist file. Ensure your home directory has appropriate permissions.
- The plist file is readable only by the current user by default.
- Consider using macOS Keychain for API key storage in production environments.
