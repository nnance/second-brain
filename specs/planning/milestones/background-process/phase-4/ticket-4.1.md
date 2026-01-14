# Ticket 4.1: Create launchd Plist Template

## Description

Create a launchd plist file that configures Second Brain to run as a macOS LaunchAgent with auto-start and crash recovery.

## Acceptance Criteria

- [ ] Plist file created: `service/com.second-brain.agent.plist`
- [ ] RunAtLoad: true (starts on login)
- [ ] KeepAlive: true (restarts on crash)
- [ ] WorkingDirectory set to project root
- [ ] Environment variables configured (placeholders for user values)
- [ ] StandardOutPath and StandardErrorPath configured
- [ ] Uses `npm start` or direct node command

## Technical Notes

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.second-brain.agent</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>dist/index.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>__WORKING_DIR__</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>VAULT_PATH</key>
        <string>__VAULT_PATH__</string>
        <key>ANTHROPIC_API_KEY</key>
        <string>__ANTHROPIC_API_KEY__</string>
        <key>LOG_FILE_PATH</key>
        <string>__LOG_FILE_PATH__</string>
        <key>SECOND_BRAIN_DATA_DIR</key>
        <string>__DATA_DIR__</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>__LOG_DIR__/stdout.log</string>

    <key>StandardErrorPath</key>
    <string>__LOG_DIR__/stderr.log</string>

    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
```

Create `service/` directory in project root for service-related files.

## Done Conditions

1. Plist file created with correct XML structure
2. All required launchd keys present
3. Placeholder values clearly marked for substitution
4. File validates with `plutil -lint service/com.second-brain.agent.plist`
