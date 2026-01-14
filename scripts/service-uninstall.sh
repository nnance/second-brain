#!/bin/bash
set -e

PLIST_DEST="$HOME/Library/LaunchAgents/com.second-brain.agent.plist"

echo "Uninstalling Second Brain service..."

if [ -f "$PLIST_DEST" ]; then
    # Unload the service (stop it)
    echo "Stopping service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true

    # Remove the plist file
    echo "Removing plist configuration..."
    rm "$PLIST_DEST"

    echo ""
    echo "✓ Service uninstalled successfully!"
    echo ""
    echo "Note: Log files and session data were preserved."
    echo "  Logs: ~/Library/Logs/second-brain/"
    echo "  Data: ~/.second-brain/"
else
    echo "Service is not installed."
fi
