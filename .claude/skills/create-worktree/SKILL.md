---
name: create-worktree
description: Create git worktrees for new features or bug fixes. Use when the user wants to start a new feature, fix a bug in a separate worktree, create a worktree, or work on something in isolation.
---

# Git Worktree Creator

Create isolated worktrees for features and bug fixes with automatic setup.

## Instructions

When the user asks to create a worktree, follow these steps:

### 1. Gather Information

Determine from the user's request:

- **Type**: Is this a `feature` or `fix`? Look for keywords like "feature", "add", "new" (→ feature) or "fix", "bug", "patch" (→ fix)
- **Name**: The descriptive name for the branch (e.g., "user-auth", "login-bug")
- **Base branch**: Default to `main` unless the user specifies another branch

If the type or name is unclear, ask the user.

### 2. Calculate Paths

```bash
# Get the repo name from the current directory
REPO_NAME=$(basename $(git rev-parse --show-toplevel))

# Worktrees folder is a sibling to the repo
WORKTREES_DIR="../${REPO_NAME}.worktrees"

# Full branch name with prefix
BRANCH_NAME="feature/name" # or "fix/name"

# New worktree path
WORKTREE_PATH="${WORKTREES_DIR}/${BRANCH_NAME}"
```

### 3. Create the Worktree

```bash
# Ensure worktrees directory exists
mkdir -p "${WORKTREES_DIR}"

# Fetch latest from remote
git fetch origin

# Create worktree with new branch from base
git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}" origin/main
```

If the user specified a different base branch, use that instead of `origin/main`.

### 4. Copy Critical Files

Copy these files from the original repo to the new worktree if they exist:

```bash
# Copy .env if it exists
[ -f .env ] && cp .env "${WORKTREE_PATH}/.env"

# Copy .claude/settings.local.json if it exists
[ -f .claude/settings.local.json ] && mkdir -p "${WORKTREE_PATH}/.claude" && cp .claude/settings.local.json "${WORKTREE_PATH}/.claude/settings.local.json"
```

### 5. Install Dependencies

```bash
cd "${WORKTREE_PATH}" && npm install
```

### 6. Report Completion

Tell the user:

- The worktree was created successfully
- The full path to the new worktree
- The branch name that was created
- Remind them they can `cd` to the worktree to start working

## Example

**User**: "Create a worktree for adding user authentication"

**Actions**:

1. Type: `feature` (keyword: "adding")
2. Name: `user-authentication`
3. Branch: `feature/user-authentication`
4. Base: `main` (default)

**Commands**:

```bash
REPO_NAME=$(basename $(git rev-parse --show-toplevel))
WORKTREES_DIR="../${REPO_NAME}.worktrees"
mkdir -p "${WORKTREES_DIR}"
git fetch origin
git worktree add -b "feature/user-authentication" "${WORKTREES_DIR}/feature/user-authentication" origin/main
[ -f .env ] && cp .env "${WORKTREES_DIR}/feature/user-authentication/.env"
[ -f .claude/settings.local.json ] && mkdir -p "${WORKTREES_DIR}/feature/user-authentication/.claude" && cp .claude/settings.local.json "${WORKTREES_DIR}/feature/user-authentication/.claude/settings.local.json"
cd "${WORKTREES_DIR}/feature/user-authentication" && npm install
```

**Response**: "Created worktree at `../claude-assistant.worktrees/feature/user-authentication` on branch `feature/user-authentication`. Dependencies installed. You can start working there now."
