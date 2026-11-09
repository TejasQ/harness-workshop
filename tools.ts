// What a tool is: a definition the model reads, and a function the harness runs when it asks.
// The model never touches the disk. It asks; your code decides.
import Anthropic from "@anthropic-ai/sdk";
import { fit } from "./context.ts";
import { gate } from "./guardrails.ts";

export type Input = Record<string, unknown>;
export type Tool = { definition: Anthropic.Beta.BetaTool; run: (input: Input) => Promise<string> };

// Every field is a required string, described in a few words. The descriptions are prompts.
export function tool(name: string, description: string, fields: Record<string, string>, run: (input: Record<string, string>) => Promise<string>): Tool {
  const properties = Object.fromEntries(Object.entries(fields).map(([key, about]) => [key, { type: "string", description: about }]));
  return { definition: { name, description, input_schema: { type: "object", properties, required: Object.keys(fields) } }, run: (input) => run(input as Record<string, string>) };
}

export async function runTool(tools: Tool[], name: string, input: Input) {
  const found = tools.find((entry) => entry.definition.name === name);
  if (!found) throw new Error(`No tool called ${name}`);
  await gate(name, input);
  return fit(await found.run(input));
}
