# Codebase Concerns

**Analysis Date:** 2026-01-13

## Tech Debt

**Duplicate utility functions across 4 locations:**
- Issue: `fileExists()` function implemented identically in 4 files
- Files: `src/tools/vault-write.ts`, `src/tools/log-interaction.ts`, `src/vault/interaction-log.ts`, `src/vault/writer.ts`
- Why: Code evolved incrementally during phase-based development
- Impact: Bug fixes must be applied in multiple places, easy to miss
- Fix approach: Extract to `src/utils/file.ts` and import everywhere

**Duplicate slug generation in 2 locations:**
- Issue: `generateSlug()` implemented in both tool and legacy module
- Files: `src/tools/vault-write.ts`, `src/vault/writer.ts`
- Why: Parallel implementations during refactoring
- Impact: Risk of divergent behavior
- Fix approach: Consolidate to single location in `src/utils/string.ts`

**Legacy vault module still present:**
- Issue: `src/vault/` directory contains old implementations superseded by `src/tools/`
- Files: `src/vault/writer.ts`, `src/vault/interaction-log.ts`
- Why: Not removed after refactoring to agent-first architecture
- Impact: Confusion about which code is active, maintenance burden
- Fix approach: Verify no active imports, then remove or mark as deprecated

**Unique filename resolution duplicated:**
- Issue: Similar `resolveUniqueFilename()` / `resolveUniqueFileName()` functions
- Files: `src/tools/vault-write.ts`, `src/vault/writer.ts`
- Why: Parallel implementations
- Impact: Same as above
- Fix approach: Consolidate with other vault utilities

## Known Bugs

- None identified during analysis

## Security Considerations

**Path traversal validation platform-specific:**
- Risk: `isValidVaultPath()` uses hardcoded `/` separator, may fail on Windows
- Files: `src/tools/vault-read.ts` (lines 58-71), `src/tools/vault-list.ts` (lines 193-206)
- Current mitigation: Works correctly on macOS/Linux (target platform)
- Recommendations: Use `path.relative()` check instead of string startsWith for cross-platform safety

**Code pattern:**
```typescript
// Current (platform-specific)
return resolvedPath.startsWith(`${vaultRoot}/`)

// Recommended (cross-platform)
const relative = path.relative(vaultRoot, resolvedPath);
return !relative.startsWith('..');
```

**Agent prompt injection:**
- Risk: User messages passed directly to Claude agent
- Files: `src/agent/runner.ts`, `src/agent/system-prompt.ts`
- Current mitigation: System prompt instructs agent behavior; tools validate inputs
- Recommendations: Consider input sanitization for special characters if issues arise

## Performance Bottlenecks

**Sequential vault scanning:**
- Problem: `vault_list` tool reads files sequentially per folder
- File: `src/tools/vault-list.ts` (lines 51-59)
- Measurement: Not measured, but linear with note count
- Cause: Sequential `readdir` + `readFile` per note
- Improvement path: Use `Promise.all()` for parallel reads within folders

**iMessage polling interval:**
- Problem: Fixed 1-second poll interval
- File: `src/messages/listener.ts` (line 23)
- Measurement: Not applicable (latency vs CPU trade-off)
- Cause: Hardcoded value
- Improvement path: Make configurable via environment variable

## Fragile Areas

**System prompt:**
- File: `src/agent/system-prompt.ts`
- Why fragile: Agent behavior entirely depends on prompt wording
- Common failures: Prompt changes can cause unexpected categorization
- Safe modification: Test thoroughly with sample messages before deploying
- Test coverage: No automated tests for prompt behavior

**Session timeout handling:**
- File: `src/sessions/timeout.ts`
- Why fragile: Complex interaction between timeout checker, agent, and session state
- Common failures: Race conditions if user responds during timeout processing
- Safe modification: Comments reference "H1 fix", "H3 fix" - these fixed race conditions
- Test coverage: Has tests, but edge cases may exist

## Scaling Limits

**In-memory session storage:**
- Current capacity: Unlimited sessions (bounded by memory)
- Limit: Thousands of sessions before memory pressure
- Symptoms at limit: Node.js memory errors
- Scaling path: Not needed for single-user local app; add persistence if multi-user

**Vault file operations:**
- Current capacity: Handles hundreds of notes efficiently
- Limit: Performance degrades with 10,000+ notes
- Symptoms at limit: Slow `vault_list` responses
- Scaling path: Add indexing or caching layer

## Dependencies at Risk

- None identified - all dependencies are actively maintained packages

## Missing Critical Features

**No graceful error recovery:**
- Problem: Agent errors result in silent failure (no user notification)
- Current workaround: User must send new message to retry
- Blocks: Reliable user experience
- Implementation complexity: Low - add error notification in catch blocks

**No message deduplication:**
- Problem: Same message could be processed twice if delivered twice by iMessage
- Current workaround: None (relies on iMessage SDK filtering)
- Blocks: Data integrity
- Implementation complexity: Medium - add message ID tracking

## Test Coverage Gaps

**System prompt behavior:**
- What's not tested: Agent decision-making for various input types
- Risk: Prompt changes could break categorization logic
- Priority: Medium
- Difficulty to test: Requires Claude API calls or prompt evaluation framework

**Timeout race conditions:**
- What's not tested: User responding exactly during timeout processing
- Risk: Session state corruption or double processing
- Priority: Low (rare edge case)
- Difficulty to test: Requires precise timing control

**iMessage integration:**
- What's not tested: Full iMessage send/receive cycle
- Risk: Integration issues not caught until manual testing
- Priority: Medium
- Difficulty to test: Requires macOS environment with Messages.app

## Documentation Gaps

**Cryptic fix comments:**
- Issue: Comments reference "H1 fix", "H3 fix" without explanation
- File: `src/sessions/timeout.ts` (lines 48, 73)
- Impact: Future developers won't understand why code exists
- Recommendation: Add context explaining what was fixed

**Complex regex undocumented:**
- Issue: YAML frontmatter parsing uses regex without comments
- File: `src/tools/vault-list.ts` (lines 125-175)
- Impact: Hard to modify without understanding pattern
- Recommendation: Add inline comments explaining regex groups

---

*Concerns audit: 2026-01-13*
*Update as issues are fixed or new ones discovered*
