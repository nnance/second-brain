# Background Process Integration Test Checklist

Complete this checklist to verify the background service system works end-to-end.

## Prerequisites

- [ ] Fresh build: `npm run build`
- [ ] Environment variables set: `VAULT_PATH`, `ANTHROPIC_API_KEY`
- [ ] Service not currently installed

## Test Scenarios

### 1. Session Persistence

**Goal:** Verify sessions survive process restart

- [ ] Start service manually: `npm start`
- [ ] Send an iMessage to create a session
- [ ] Stop service: Ctrl+C
- [ ] Verify file exists: `ls ~/.second-brain/sessions.json`
- [ ] Verify session data in file: `cat ~/.second-brain/sessions.json`
- [ ] Restart service: `npm start`
- [ ] Verify logs show "Sessions restored: 1"
- [ ] Send follow-up message, verify context preserved

**Pass:** Session context maintained across restart

---

### 2. Graceful Shutdown

**Goal:** Verify clean shutdown on signals

- [ ] Start service: `npm start`
- [ ] Note the PID
- [ ] Send SIGTERM: `kill <pid>`
- [ ] Verify logs show "Graceful shutdown initiated"
- [ ] Verify logs show "Sessions saved"
- [ ] Verify process exited cleanly (no crash)

**Pass:** Clean shutdown with state saved

---

### 3. Service Installation

**Goal:** Verify launchd service installs correctly

- [ ] Run: `npm run service:install`
- [ ] Verify plist exists: `ls ~/Library/LaunchAgents/com.second-brain.agent.plist`
- [ ] Verify service loaded: `launchctl list | grep second-brain`
- [ ] Verify service running: `npm run status`

**Pass:** Service installed and running

---

### 4. Auto-Start on Login

**Goal:** Verify service starts after login

- [ ] Log out of macOS
- [ ] Log back in
- [ ] Wait 30 seconds
- [ ] Run: `npm run status`

**Pass:** Service running without manual intervention

---

### 5. Crash Recovery

**Goal:** Verify service restarts after crash

- [ ] Get service PID: `npm run status -- --json`
- [ ] Kill process: `kill -9 <pid>`
- [ ] Wait 15 seconds (ThrottleInterval + startup)
- [ ] Run: `npm run status`
- [ ] Verify new PID (different from before)

**Pass:** Service restarted automatically

---

### 6. Git Auto-Update

**Goal:** Verify service pulls and restarts on new commits

- [ ] Create a test branch: `git checkout -b test-update`
- [ ] Make a small change to a source file
- [ ] Commit and push: `git commit -am "test" && git push`
- [ ] Merge to main (via PR or direct push)
- [ ] Watch logs: `tail -f ~/Library/Logs/second-brain/stdout.log`
- [ ] Wait for poll interval (or set `GIT_POLL_INTERVAL_MS=60000`)
- [ ] Verify logs show "New commits detected"
- [ ] Verify logs show "Pulling changes"
- [ ] Verify service restarted with new code

**Pass:** Service auto-updated from git

---

### 7. Status Command

**Goal:** Verify status command works correctly

- [ ] With service running: `npm run status` → shows "Running"
- [ ] With service running: `npm run status; echo $?` → exit code 0
- [ ] Stop service: `npm run service:stop`
- [ ] With service stopped: `npm run status` → shows "Stopped"
- [ ] With service stopped: `npm run status; echo $?` → exit code 1
- [ ] JSON output: `npm run status -- --json` → valid JSON

**Pass:** Status accurately reflects service state

---

### 8. Log Rotation

**Goal:** Verify logs rotate and clean up

- [ ] Check log directory: `ls ~/Library/Logs/second-brain/`
- [ ] Verify dated log files exist
- [ ] Create fake old log: `touch -t 202501010000 ~/Library/Logs/second-brain/second-brain.2025-01-01.log`
- [ ] Restart service
- [ ] Verify old log deleted

**Pass:** Logs rotate and old logs cleaned up

---

## Cleanup

After testing:

- [ ] Uninstall service: `npm run service:uninstall`
- [ ] Clean test data: `rm -rf ~/.second-brain/sessions.json`
- [ ] Delete test branch: `git branch -D test-update`

## Results Summary

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Session Persistence | | |
| 2. Graceful Shutdown | | |
| 3. Service Installation | | |
| 4. Auto-Start on Login | | |
| 5. Crash Recovery | | |
| 6. Git Auto-Update | | |
| 7. Status Command | | |
| 8. Log Rotation | | |

**Overall:** __ / 8 tests passed

## Troubleshooting

### Service won't start

1. Check environment variables in plist: `cat ~/Library/LaunchAgents/com.second-brain.agent.plist`
2. Check stderr for errors: `cat ~/Library/Logs/second-brain/stderr.log`
3. Verify tsx exists: `ls node_modules/.bin/tsx`

### Git monitor not detecting changes

1. Verify git remote: `git remote -v`
2. Check fetch works: `git fetch origin main`
3. Check poll interval: `GIT_POLL_INTERVAL_MS` (default 5 minutes)

### Sessions not persisting

1. Check data directory exists: `ls ~/.second-brain/`
2. Check write permissions: `touch ~/.second-brain/test && rm ~/.second-brain/test`
3. Check sessions.json for valid JSON: `cat ~/.second-brain/sessions.json | jq .`
