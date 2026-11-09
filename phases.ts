// Phases. One long loop fails as its steps multiply. The lead splits a big job into phases, runs
// each one as a fresh agent with an empty context, and keeps only its short note.
import { runAgent, type Agent } from "./agent.ts";
import { tool, type Tool } from "./tools.ts";

const LEAD = "For a job with several parts, plan the parts, then hand each one to run_phase with everything it needs to know. Check each note before the next phase.";
const PHASE = "You are doing one phase of a bigger job. Do it, then end with a note of at most five lines: what you did, what you found, what is left.";

// A phase prints indented, so you can see it is a separate agent.
const indent = (log: Agent["log"]) => (line: string) => log(line.split("\n").map((part) => `  │ ${part}`).join("\n"));

export function lead(system: string, tools: Tool[], log: Agent["log"]): Agent {
  const phase: Agent = { system: `${system} ${PHASE}`, tools, log: indent(log) };
  const runPhase = tool("run_phase", "Hand one part of the job to a fresh agent with an empty context. It returns a short note.", { brief: "Everything the phase needs: the goal, what to look at, what done looks like" }, async ({ brief }) => {
    const note = await runAgent([{ role: "user", content: brief }], phase);
    return note || "The phase ended without a note.";
  });
  return { system: `${system} ${LEAD}`, tools: [...tools, runPhase], log };
}
