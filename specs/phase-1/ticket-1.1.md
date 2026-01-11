# Ticket 1.1: Initialize TypeScript Project

## Description
Set up the foundational TypeScript project structure with minimal configuration. Use tsx for execution, Biome for linting/formatting, and establish the basic folder structure.

## Acceptance Criteria
- [ ] `package.json` exists with project name `second-brain`
- [ ] TypeScript configured with `tsconfig.json`
- [ ] Biome configured with `biome.json` for linting and formatting
- [ ] Source files in `src/` directory
- [ ] `npm run build` compiles TypeScript without errors
- [ ] `npm run lint` runs Biome checks
- [ ] `npm run format` formats code with Biome

## Technical Notes

### Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@biomejs/biome": "^1.x"
  }
}
```

### Folder Structure
```
second-brain/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
└── biome.json
```

### tsconfig.json
- Target: ES2022 or later
- Module: NodeNext
- Strict mode enabled
- Output to `dist/`

### biome.json
- Enable linting and formatting
- Reasonable defaults (no need for extensive customization)

### package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "lint": "biome check .",
    "format": "biome format . --write"
  }
}
```

### src/index.ts
Minimal entry point:
```typescript
console.log('second-brain starting...');
```

## Done Conditions (for Claude Code to verify)
1. Run `npm install` — exits 0
2. Run `npm run build` — exits 0, `dist/` directory created
3. Run `npm run lint` — exits 0
4. Run `node dist/index.js` — outputs "second-brain starting..."
