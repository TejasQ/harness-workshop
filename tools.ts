// What a tool is: a definition the model reads, and a function the harness runs when it asks.
// The model never touches the disk. It asks; your code decides.
import Anthropic from "@anthropic-ai/sdk";
import { gate } from "./guardrails.ts";

export type Input = Record<string, string>;
export type Tool = { definition: Anthropic.Tool; run: (input: Input) => Promise<string> };

// Every field is a required string, described in a few words. The descriptions are prompts.
export function tool(name: string, description: string, fields: Input, run: Tool["run"]): Tool {
  const properties = Object.fromEntries(Object.entries(fields).map(([key, about]) => [key, { type: "string", description: about }]));
  return { definition: { name, description, input_schema: { type: "object", properties, required: Object.keys(fields) } }, run };
}

export async function runTool(tools: Tool[], name: string, input: Input) {
  const found = tools.find((entry) => entry.definition.name === name);
  if (!found) throw new Error(`No tool called ${name}`);
  await gate(name, input);
  return await found.run(input);
}
