# Ticket 4.6: Implement Confirmation Reply

## Description
After successfully storing an item, send a confirmation message back to the user via iMessage. Keep the confirmation minimal as specified.

## Acceptance Criteria
- [ ] Confirmation sender module exists at `src/messages/sender.ts`
- [ ] Sends confirmation after successful storage
- [ ] Confirmation format is minimal: "✓ Saved to {Category}"
- [ ] Uses imessage-kit to send messages
- [ ] Handles send failures gracefully (log error, don't crash)
- [ ] Integrated into main message flow

## Technical Notes

### Confirmation Format
Minimal style as specified:
```
✓ Saved to Tasks
```

Not:
```
✓ Saved to Tasks: "Follow up with Sarah about security audit" #person/sarah #priority/high
```

### src/messages/sender.ts
```typescript
import logger from '../logger.js';
// Import send function from imessage-kit per its documentation

export interface SendResult {
  success: boolean;
  error?: string;
}

export async function sendMessage(to: string, content: string): Promise<SendResult> {
  logger.debug({ to, contentLength: content.length }, 'Sending iMessage');
  
  try {
    // Use imessage-kit's send functionality
    // await imessageKit.send(to, content);
    
    logger.info({ to }, 'iMessage sent successfully');
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ to, error: errorMessage }, 'Failed to send iMessage');
    return { success: false, error: errorMessage };
  }
}

export function formatConfirmation(category: string): string {
  return `✓ Saved to ${category}`;
}

export function formatClarificationRequest(question: string): string {
  return question;
}
```

### Integration with Message Handler (src/index.ts)

After successful storage (high confidence path):
```typescript
const analysis = await analyzeInput(message.text);

if (!shouldClarify(analysis.confidence)) {
  const result = await writeNote({ ... });
  await writeInteractionLog({ ... });
  
  // Send confirmation
  await sendMessage(
    message.sender,
    formatConfirmation(analysis.category)
  );
}
```

After successful storage (post-clarification path):
```typescript
// After clarification response is processed and item is stored
await sendMessage(
  message.sender,
  formatConfirmation(finalCategory)
);
```

### Send Clarification Question
Also use sender for clarification questions:
```typescript
if (shouldClarify(analysis.confidence)) {
  const clarification = await generateClarificationQuestion(message.text, analysis);
  
  setPendingClarification({
    senderId: message.sender,
    originalInput: message.text,
    analysis,
    clarificationQuestion: clarification.question,
    createdAt: new Date(),
  });
  
  await sendMessage(
    message.sender,
    formatClarificationMessage(clarification)
  );
}
```

### Error Handling
- Send failures should not prevent storage
- Log errors but continue operation
- Consider: retry logic for transient failures (future enhancement)

### Unit Tests: src/messages/sender.test.ts
Test cases:
- `formatConfirmation` produces correct format
- `formatClarificationRequest` passes through question

Note: Actual send functionality should be mocked in tests.

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, sender tests pass
3. File `src/messages/sender.ts` exists
4. Send a clear task message → receive "✓ Saved to Tasks" reply
5. Send failures are logged but don't crash the app
