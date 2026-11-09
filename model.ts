// The model. Claude by default, or any model with an Anthropic-compatible endpoint, like IBM Granite
// on this laptop through Ollama. The loop, tools, gates and phases stay. Only the brain changes.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.MODEL ?? "claude-haiku-5-5"; // or granite4:tiny-h, after `ollama pull granite4:tiny-h`
export const LOCAL = !MODEL.startsWith("claude");
export const client = LOCAL
  ? new Anthropic({ baseURL: process.env.OLLAMA_URL ?? "http://localhost:11434", apiKey: "ollama" })
  : new Anthropic();
