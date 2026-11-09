// Guardrails. A cap on steps and tokens, so a stuck loop ends as a pause and not a bill, and a gate
// before anything the person cannot take back. The model proposes; the person decides.
import { confirm } from "./terminal.ts";
import type { Input } from "./tools.ts";

const MAX_STEPS = 25; // model calls per task
const MAX_TOKENS = 300_000; // input plus output tokens per task
const ASK_FIRST = new Set(["write_file", "edit_file", "bash"]); // changes something

// One budget per task: count every model call, and say when either cap is reached.
export function budget() {
  let steps = 0;
  let tokens = 0;
  return {
    count: (used: number) => {
      steps += 1;
      tokens += used;
    },
    spent: () => steps >= MAX_STEPS || tokens >= MAX_TOKENS,
    toString: () => `${steps} steps and ${tokens} tokens`,
  };
}

// A no becomes an error the model can see, so it asks instead of trying again.
export async function gate(name: string, input: Input) {
  if (!ASK_FIRST.has(name)) return;
  if (!(await confirm(`allow ${name} ${JSON.stringify(input)}?`))) throw new Error("The person said no. Ask them what to do instead.");
}
