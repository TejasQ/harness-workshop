// The tools. A definition the model reads, and the code the harness runs when the model asks.
// The model never touches the disk. It asks; your code decides.
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";

export const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read a text file from the current project, by its path relative to the project root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Like src/index.ts" } },
      required: ["path"],
    },
  },
];

export async function runTool(name: string, input: { path: string }) {
  if (name === "read_file") return await readFile(input.path, "utf8");
  throw new Error(`No tool called ${name}`);
}
