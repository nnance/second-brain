# Second Brain

A personal knowledge capture system that turns iMessage conversations into an organized Obsidian vault. Send a text, and Claude intelligently categorizes it as a task, idea, reference, or project note—complete with tags and confidence-based clarification when needed.

## How It Works

```
You: "remind me to follow up with Sarah about the security audit"
     ↓
[iMessage] → [Claude Analysis] → [Obsidian Vault]
     ↓
Tasks/2026-01-10_follow-up-sarah-security-audit.md
  - #person/sarah
  - #project/security-audit
  - #priority/high
```

When Claude isn't sure how to categorize something, it asks:

```
You: "interesting article about zero-trust architecture"
     ↓
Claude: "Is this a link to save, a concept to research, or a thought to capture?"
     ↓
You: "link to save"
     ↓
Reference/2026-01-10_zero-trust-architecture-article.md
```

## Features

- **Natural language capture** via iMessage
- **Intelligent categorization** into Tasks, Ideas, Reference, or Projects
- **Automatic tagging** with people, projects, topics, priority, and status
- **Confidence-based workflow** — asks clarifying questions when uncertain
- **Complete audit trail** — every interaction logged for transparency
- **Obsidian-native** — plain markdown with YAML frontmatter

## Requirements

- macOS with Messages.app signed into a dedicated iMessage account
- Node.js 20+ (LTS)
- An Obsidian vault (shared via iCloud recommended)
- Anthropic API key

## Environment Setup

This system requires a dedicated macOS user account for the AI agent. This isolates the agent's iMessage access and provides a clean environment for running the service.

### 1. Create a dedicated Apple ID for the AI agent

1. Go to [appleid.apple.com](https://appleid.apple.com) and create a new Apple ID
2. Use a dedicated email address for the agent (e.g., `myname-ai-agent@icloud.com`)
3. Complete verification and setup

### 2. Add the AI agent as a user on your Mac

1. Open **System Settings** → **Users & Groups**
2. Click **Add User...**
3. Create a new Standard user account for the AI agent
4. Sign into the new account with the AI agent's Apple ID

### 3. Set up a shared Obsidian vault

1. On your **primary user account**, create or identify your Obsidian vault
2. Store the vault in your iCloud Drive folder (e.g., `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/SecondBrain`)
3. Share this vault folder with the AI agent account:
   - Right-click the vault folder → **Get Info**
   - Under **Sharing & Permissions**, click the lock to make changes
   - Click **+** and add the AI agent user account
   - Set permissions to **Read & Write**
   - Click the gear icon → **Apply to enclosed items**

### 4. Configure the AI agent account

1. Log into the AI agent user account
2. Open **Messages.app** and sign in with the AI agent's Apple ID
3. Clone this repository and install dependencies (see Installation below)
4. Configure the `.env` file with the path to the shared vault
5. Grant Full Disk Access (see below)

### 5. Send messages to your AI agent

From your primary account (or any device), send iMessages to the AI agent's Apple ID. The agent will process them and store notes in the shared Obsidian vault, which syncs back to your primary account via iCloud.

## Installation

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd second-brain
npm install
```

### 2. Grant Full Disk Access (required)

The app reads directly from the macOS Messages database, which requires Full Disk Access permission.

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the **+** button
3. Add the app you'll run `npm start` from:
   - **Terminal**: `/Applications/Utilities/Terminal.app`
   - **VS Code**: `/Applications/Visual Studio Code.app`
   - **Cursor**: `/Applications/Cursor.app`
   - **iTerm**: `/Applications/iTerm.app`
4. **Restart your terminal/IDE completely** (quit and reopen)

Verify the permission is working:

```bash
ls ~/Library/Messages/chat.db
```

If you see the file path, you're good. If you get "Operation not permitted", the permission hasn't been granted or the app needs to be restarted.

### 3. Sign into Messages.app

Sign into Messages.app with the AI agent's dedicated iMessage account.

## Configuration

Create a `.env` file:

```bash
VAULT_PATH=/path/to/your/obsidian/vault
ANTHROPIC_API_KEY=your-api-key

# Optional
LOG_LEVEL=info
CLAUDE_MODEL=claude-sonnet-4-20250514
CONFIDENCE_THRESHOLD=70
CLARIFICATION_TIMEOUT_MS=3600000
```

Initialize the vault structure:

```bash
npm run vault:init
```

## Usage

```bash
npm start
```

Send a text to your dedicated iMessage account. The system will:
1. Analyze the message with Claude
2. Categorize and tag it
3. Store it in the appropriate vault folder
4. Send a confirmation (or ask for clarification if uncertain)

## Vault Structure

```
vault/
├── _system/logs/    # Daily interaction logs
├── Tasks/           # Actionable items
├── Ideas/           # Thoughts to explore
├── Reference/       # Information to retrieve later
├── Projects/        # Multi-note initiatives
├── Inbox/           # Items needing manual triage
└── Archive/         # Completed items
```

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Run with tsx
npm test           # Run tests
npm run lint       # Check with Biome
npm run format     # Format with Biome
```

## Project Status

The core system is functional. See [`specs/FEATURE-QUEUE.md`](specs/FEATURE-QUEUE.md) for the roadmap of planned features and their current status.

**Current capabilities:**
- iMessage listener captures incoming messages
- Claude agent analyzes and categorizes content
- Notes stored in Obsidian vault with tags and metadata
- Clarification flow for ambiguous messages
- Complete interaction audit trail

**Planned features** (see feature queue for details):
- Archive lifecycle management
- macOS background service (launchd)
- GitHub auto-pull and restart
- Additional adapters (Slack, Apple Calendar, Contacts)
- Tag evolution and suggestions

## License

MIT
