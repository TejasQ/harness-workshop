// The agent loop. Call the model; while it asks for tools, run them, send the results back, and
// call it again. This loop is the whole difference between a chatbot and an agent.
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "./coding.ts";
import { budget } from "./guardrails.ts";
import { log } from "./terminal.ts";
import { runTool, type Input } from "./tools.ts";

const client = new Anthropic();
const MODEL = process.env.MODEL ?? "claude-haiku-5-5";
const tools = TOOLS.map((entry) => entry.definition);

export async function runAgent(messages: Anthropic.MessageParam[]) {
  const used = budget();
  while (true) {
    if (used.spent()) {
      log(`\n! stopped after ${used}. Say "go on" to continue.`);
      return;
    }
    const response = await client.messages.create({ model: MODEL, max_tokens: 16000, tools, messages });
    used.count(response.usage.input_tokens + response.usage.output_tokens);
    // Append the whole content, never just the text: the history only ever grows.
    messages.push({ role: "assistant", content: response.content });
    for (const block of response.content) if (block.type === "text") log(`\nai> ${block.text}`);
    if (response.stop_reason === "max_tokens") log("\n! the answer was cut off at max_tokens");
    if (response.stop_reason === "refusal") log("\n! the model declined this one");
    if (response.stop_reason !== "tool_use") return;
    messages.push({ role: "user", content: await runTools(response.content) });
  }
}

// Every tool_use gets exactly one tool_result, all in ONE user message. An error goes back as a
// result too: the model can recover from an error it can see.
async function runTools(content: Anthropic.ContentBlock[]) {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    log(`  ↳ ${block.name} ${JSON.stringify(block.input)}`);
    try {
      const output = await runTool(TOOLS, block.name, block.input as Input);
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    } catch (error) {
      results.push({ type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true });
    }
  }
  return results;
}
