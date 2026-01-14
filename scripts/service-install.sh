#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_SRC="$PROJECT_DIR/service/com.second-brain.agent.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.second-brain.agent.plist"
LOG_DIR="$HOME/Library/Logs/second-brain"
DATA_DIR="$HOME/.second-brain"

echo "Installing Second Brain service..."

# Validate required environment variables
if [ -z "$VAULT_PATH" ]; then
    echo "Error: VAULT_PATH environment variable is required"
    echo "Set it in your shell profile (~/.zshrc or ~/.bashrc):"
    echo '  export VAULT_PATH="/path/to/your/obsidian/vault"'
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is required"
    echo "Set it in your shell profile (~/.zshrc or ~/.bashrc):"
    echo '  export ANTHROPIC_API_KEY="your-api-key"'
    exit 1
fi

# Verify plist template exists
if [ ! -f "$PLIST_SRC" ]; then
    echo "Error: Plist template not found at $PLIST_SRC"
    exit 1
fi

# Create required directories
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$(dirname "$PLIST_DEST")"

# Get tsx path (from local node_modules)
TSX_PATH="$PROJECT_DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX_PATH" ]; then
    echo "Error: tsx not found at $TSX_PATH"
    echo "Run 'npm install' first"
    exit 1
fi

# Unload existing service if present
if [ -f "$PLIST_DEST" ]; then
    echo "Unloading existing service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Substitute placeholders and create plist
echo "Creating plist configuration..."
sed -e "s|__WORKING_DIR__|$PROJECT_DIR|g" \
    -e "s|__VAULT_PATH__|$VAULT_PATH|g" \
    -e "s|__ANTHROPIC_API_KEY__|$ANTHROPIC_API_KEY|g" \
    -e "s|__LOG_FILE_PATH__|$LOG_DIR|g" \
    -e "s|__DATA_DIR__|$DATA_DIR|g" \
    -e "s|__LOG_DIR__|$LOG_DIR|g" \
    -e "s|__TSX_PATH__|$TSX_PATH|g" \
    -e "s|__PATH__|$PATH|g" \
    "$PLIST_SRC" > "$PLIST_DEST"

# Load the service
echo "Loading service..."
launchctl load "$PLIST_DEST"

echo ""
echo "✓ Service installed and started successfully!"
echo ""
echo "Useful commands:"
echo "  npm run service:status   - Check service status"
echo "  npm run service:stop     - Stop the service"
echo "  npm run service:start    - Start the service"
echo "  npm run service:restart  - Restart the service"
echo "  npm run service:uninstall - Remove the service"
echo ""
echo "Log files:"
echo "  $LOG_DIR/stdout.log"
echo "  $LOG_DIR/stderr.log"
