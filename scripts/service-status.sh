#!/bin/bash

SERVICE_NAME="com.second-brain.agent"
PLIST_DEST="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"
LOG_DIR="$HOME/Library/Logs/second-brain"

echo "Second Brain Service Status"
echo "============================"
echo ""

# Check if plist is installed
if [ -f "$PLIST_DEST" ]; then
    echo "✓ Service is installed"
else
    echo "✗ Service is not installed"
    echo "  Run 'npm run service:install' to install"
    exit 0
fi

# Check if service is running
if launchctl list | grep -q "$SERVICE_NAME"; then
    PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
    if [ "$PID" != "-" ] && [ -n "$PID" ]; then
        echo "✓ Service is running (PID: $PID)"
    else
        echo "✗ Service is loaded but not running"
    fi
else
    echo "✗ Service is not loaded"
fi

echo ""
echo "Log files:"
if [ -f "$LOG_DIR/stdout.log" ]; then
    echo "  stdout.log: $(wc -l < "$LOG_DIR/stdout.log" | tr -d ' ') lines"
else
    echo "  stdout.log: not found"
fi

if [ -f "$LOG_DIR/stderr.log" ]; then
    STDERR_LINES=$(wc -l < "$LOG_DIR/stderr.log" | tr -d ' ')
    if [ "$STDERR_LINES" -gt 0 ]; then
        echo "  stderr.log: $STDERR_LINES lines (check for errors)"
    else
        echo "  stderr.log: empty (no errors)"
    fi
else
    echo "  stderr.log: not found"
fi

echo ""
echo "Recent log entries:"
if [ -f "$LOG_DIR/stdout.log" ]; then
    echo "--- Last 5 lines of stdout.log ---"
    tail -5 "$LOG_DIR/stdout.log" 2>/dev/null || echo "  (no recent output)"
fi
