// The terminal. Read a line, hand it to the agent, repeat. The agent itself lives in agent.ts.
// The model remembers nothing. This array is the whole memory, and the harness owns it.
import { runAgent, type History } from "./agent.ts";
import { SYSTEM, TOOLS } from "./coding.ts";
import { lead } from "./phases.ts";
import { log, prompt } from "./terminal.ts";

const agent = lead(SYSTEM, TOOLS, log);
const messages: History = [];

while (true) {
  const line = await prompt();
  if (!line.trim()) continue;
  messages.push({ role: "user", content: line });
  await runAgent(messages, agent);
}
