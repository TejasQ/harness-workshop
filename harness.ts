// The terminal. Read a line, hand it to the agent, repeat. The agent itself lives in agent.ts, or
// rent it: managed.ts runs the same tools on Claude Managed Agents. Swap the import to compare.
import type { History } from "./agent.ts";
import { SYSTEM, TOOLS } from "./browser.ts"; // or ./coding.ts: the same loop, another domain
import { runAgent } from "./managed.ts"; // or ./agent.ts: our own loop, on this laptop
import { log, prompt } from "./terminal.ts";

// No lead here: Managed Agents has its own way to split a job, so the phases stay in step 5.
const agent = { system: SYSTEM, tools: TOOLS, log };
const messages: History = [];

while (true) {
  const line = await prompt();
  if (!line.trim()) continue;
  messages.push({ role: "user", content: line });
  await runAgent(messages, agent);
}
