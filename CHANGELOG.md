# Changelog

One entry per branch, newest first. `git diff <n-1> <n>` shows exactly what each entry describes.

## 0: the empty loop

**Changed:** new `harness.ts`. A terminal chat: one `messages` array, a `while (true)`, one model call per line you type.

**Prompt:**

> Write `harness.ts`, a TypeScript terminal chat with Claude using `@anthropic-ai/sdk`. Keep one `messages` array. In a `while (true)` loop, read a line from stdin, push it as a user message, call `client.messages.create` with model `claude-haiku-5-5` and `max_tokens: 16000`, push the response's whole `content` back as the assistant message (not just the text), and print the text blocks. No tools yet. Under 30 lines.

**Try:** "My name is Ada." then "What's my name?" Restart, ask again.

**Why:** the model is stateless. The harness owns the memory, and it only ever appends.
