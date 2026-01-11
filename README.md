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
- An Obsidian vault
- Anthropic API key

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

Sign into Messages.app with a dedicated iMessage account that will receive your capture messages.

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

Under development. See `specs/` for the implementation plan:

- **Phase 1**: Project setup + iMessage listener
- **Phase 2**: Obsidian file writer + interaction log
- **Phase 3**: Claude categorization + tags
- **Phase 4**: Clarification flow + confirmation

## License

MIT
