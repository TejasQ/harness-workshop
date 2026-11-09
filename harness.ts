// Step 0: the empty loop. A model, a list of messages, and a while(true).
// The model remembers nothing. This array is the whole memory, and the harness owns it.
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";

const client = new Anthropic();
const MODEL = process.env.MODEL ?? "claude-haiku-5-5";
const terminal = createInterface({ input: process.stdin, output: process.stdout });
const messages: Anthropic.MessageParam[] = [];

while (true) {
  const ask = await terminal.question("\nyou> ");
  if (!ask.trim()) continue;
  messages.push({ role: "user", content: ask });

  const response = await client.messages.create({ model: MODEL, max_tokens: 16000, messages });

  // Append the whole content, never just the text: the history only ever grows.
  messages.push({ role: "assistant", content: response.content });
  for (const block of response.content) if (block.type === "text") console.log(`\nai> ${block.text}`);
}
