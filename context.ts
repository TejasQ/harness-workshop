// Context. The whole prompt is resent on every step, so the prompt is the bill. Cache the part that
// never changes, cut tool results where they are made, and let the API compact before the price step.
import Anthropic from "@anthropic-ai/sdk";
import { LOCAL } from "./model.ts";

const MAX_RESULT = 12_000; // characters a tool result may put into the context
const COMPACT_AT = 90_000; // Haiku 5.5 charges 5x for the whole request past 100k prompt tokens

// Sent with every request. Stable first: tools, then the system prompt, then the conversation.
// Caching and compaction are Claude API features; a local model gets the plain request.
export const CONTEXT = LOCAL
  ? {}
  : ({
      cache_control: { type: "ephemeral" }, // cache everything up to the newest message
      betas: ["compact-2026-01-12"],
      context_management: { edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: COMPACT_AT } }] },
    } satisfies Partial<Anthropic.Beta.MessageCreateParamsNonStreaming>);

// Compact at the source: a huge result is cut where it is made, with a note on how to get the rest.
export function fit(output: string) {
  if (output.length <= MAX_RESULT) return output;
  return `${output.slice(0, MAX_RESULT)}\n[cut: ${output.length - MAX_RESULT} more characters. Ask for a smaller part.]`;
}

// Claude Haiku 5.5, US dollars per million tokens. A model on your own laptop costs electricity.
const PRICE = LOCAL ? { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 } : { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 };
let spent = 0;

// Print what one call cost, and return the tokens it used for the budget.
export function cost(usage: Anthropic.Beta.BetaUsage, log: (line: string) => void) {
  const prompt = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  const step = prompt > 100_000 ? 5 : 1;
  const dollars =
    (usage.input_tokens * PRICE.input +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      usage.output_tokens * PRICE.output) * step / 1e6;
  spent += dollars;
  log(`  · ${prompt} prompt tokens (${usage.cache_read_input_tokens ?? 0} cached), $${dollars.toFixed(4)}, $${spent.toFixed(4)} so far`);
  return prompt + usage.output_tokens;
}
