// The agent loop. Call the model; while it asks for tools, run them, send the results back, and
// call it again. This loop is the whole difference between a chatbot and an agent.
import Anthropic from "@anthropic-ai/sdk";
import { CONTEXT, cost } from "./context.ts";
import { budget } from "./guardrails.ts";
import { runTool, type Input, type Tool } from "./tools.ts";

const client = new Anthropic();
const MODEL = process.env.MODEL ?? "claude-haiku-5-5";

// The same loop runs any agent: the lead, or a phase. Only these change.
export type Agent = { system: string; tools: Tool[]; log: (line: string) => void };
export type History = Anthropic.Beta.BetaMessageParam[];

// Runs until the model stops asking for tools, and returns its last text.
export async function runAgent(history: History, agent: Agent): Promise<string> {
  const used = budget();
  let last = "";
  while (true) {
    if (used.spent()) {
      agent.log(`\n! stopped after ${used}. Say "go on" to continue.`);
      return `${last}\n[stopped at the cap: ${used}]`;
    }
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: agent.system,
      tools: agent.tools.map((entry) => entry.definition),
      messages: history,
      ...CONTEXT,
    });
    used.count(cost(response.usage, agent.log));
    // Append the whole content, never just the text: the history only ever grows. A compaction
    // block, when one comes back, travels in this content too. Keep it.
    history.push({ role: "assistant", content: response.content });
    for (const block of response.content) {
      if (block.type === "text") {
        last = block.text;
        agent.log(`\nai> ${block.text}`);
      }
      if (block.type === "compaction") agent.log("\n! compacted: older turns are now a summary");
    }
    if (response.stop_reason === "max_tokens") agent.log("\n! the answer was cut off at max_tokens");
    if (response.stop_reason === "refusal") agent.log("\n! the model declined this one");
    if (response.stop_reason !== "tool_use") return last;
    history.push({ role: "user", content: await runTools(response.content, agent) });
  }
}

// Every tool_use gets exactly one tool_result, all in ONE user message. An error goes back as a
// result too: the model can recover from an error it can see.
async function runTools(content: Anthropic.Beta.BetaContentBlock[], agent: Agent) {
  const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    agent.log(`  ↳ ${block.name} ${JSON.stringify(block.input).slice(0, 200)}`);
    try {
      const output = await runTool(agent.tools, block.name, block.input as Input);
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    } catch (error) {
      results.push({ type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true });
    }
  }
  return results;
}
