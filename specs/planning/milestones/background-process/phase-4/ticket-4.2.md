# Ticket 4.2: Write Install/Uninstall npm Scripts

## Description

Create npm scripts and supporting shell scripts to install and uninstall the launchd service.

## Acceptance Criteria

- [ ] `npm run service:install` installs and starts the service
- [ ] `npm run service:uninstall` stops and removes the service
- [ ] `npm run service:restart` restarts the service
- [ ] `npm run service:stop` stops the service
- [ ] `npm run service:start` starts the service
- [ ] Install script substitutes environment variables into plist
- [ ] Install script validates required env vars are set
- [ ] Scripts provide clear success/error messages

## Technical Notes

Create `scripts/service-install.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_SRC="$PROJECT_DIR/service/com.second-brain.agent.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.second-brain.agent.plist"
LOG_DIR="$HOME/Library/Logs/second-brain"

# Validate required environment variables
if [ -z "$VAULT_PATH" ]; then
    echo "Error: VAULT_PATH environment variable is required"
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is required"
    exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Get node path
NODE_PATH=$(which node)

# Substitute placeholders
sed -e "s|__WORKING_DIR__|$PROJECT_DIR|g" \
    -e "s|__VAULT_PATH__|$VAULT_PATH|g" \
    -e "s|__ANTHROPIC_API_KEY__|$ANTHROPIC_API_KEY|g" \
    -e "s|__LOG_FILE_PATH__|$LOG_DIR|g" \
    -e "s|__DATA_DIR__|$HOME/.second-brain|g" \
    -e "s|__LOG_DIR__|$LOG_DIR|g" \
    -e "s|/usr/local/bin/node|$NODE_PATH|g" \
    "$PLIST_SRC" > "$PLIST_DEST"

# Load the service
launchctl load "$PLIST_DEST"

echo "Service installed and started"
echo "Check status with: npm run service:status"
```

Create `scripts/service-uninstall.sh`:

```bash
#!/bin/bash
set -e

PLIST_DEST="$HOME/Library/LaunchAgents/com.second-brain.agent.plist"

if [ -f "$PLIST_DEST" ]; then
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    rm "$PLIST_DEST"
    echo "Service uninstalled"
else
    echo "Service not installed"
fi
```

Add to `package.json`:

```json
{
  "scripts": {
    "service:install": "bash scripts/service-install.sh",
    "service:uninstall": "bash scripts/service-uninstall.sh",
    "service:restart": "launchctl kickstart -k gui/$(id -u)/com.second-brain.agent",
    "service:stop": "launchctl stop com.second-brain.agent",
    "service:start": "launchctl start com.second-brain.agent"
  }
}
```

## Done Conditions

1. All scripts created and executable (`chmod +x`)
2. `npm run service:install` successfully installs service
3. `npm run service:uninstall` successfully removes service
4. Service appears in `launchctl list` after install
5. Service removed from `launchctl list` after uninstall
