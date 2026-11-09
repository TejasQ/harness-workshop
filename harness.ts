// The terminal. Read a line, hand it to the agent, repeat. The agent itself lives in agent.ts.
// The model remembers nothing. This array is the whole memory, and the harness owns it.
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "./agent.ts";
import { prompt } from "./terminal.ts";

const messages: Anthropic.MessageParam[] = [];

while (true) {
  const line = await prompt();
  if (!line.trim()) continue;
  messages.push({ role: "user", content: line });
  await runAgent(messages);
}
