// The loop, rented. Claude Managed Agents runs the agent loop, keeps the history and handles the
// context on Anthropic's side. We keep the registry and the gate: each of our tools goes up as a
// custom tool, and when the agent asks for one, it runs here on this laptop, exactly as before.
// runAgent has the same shape as the one in agent.ts, so harness.ts only swaps an import.
import type { Agent, History } from "./agent.ts";
import { cost } from "./context.ts";
import { budget } from "./guardrails.ts";
import { client, MODEL } from "./model.ts";
import { runTool, type Input } from "./tools.ts";

// Agent, environment, session: three API calls, made once, on the first line.
let session: Promise<string> | undefined;

async function start(agent: Agent) {
  // A custom tool is our definition with a type on it. Its function never leaves this laptop.
  const tools = agent.tools.map(({ definition }) => ({
    type: "custom" as const,
    name: definition.name,
    description: definition.description ?? "",
    input_schema: { type: "object" as const, properties: definition.input_schema.properties as Record<string, unknown>, required: definition.input_schema.required as string[] },
  }));
  const made = await client.beta.agents.create({ name: "harness-workshop", model: MODEL, system: agent.system, tools });
  // The sandbox our tools don't need: they run here. Closed to the internet.
  const environment = await client.beta.environments.create({ name: "harness-workshop", config: { type: "cloud", networking: { type: "limited" } } });
  const { id } = await client.beta.sessions.create({ agent: made.id, environment_id: environment.id });
  return id;
}

// Sends the newest line and follows the events until the agent goes idle. The session already
// holds everything before that line: the history lives on their side now.
export async function runAgent(history: History, agent: Agent): Promise<string> {
  session ??= start(agent);
  const id = await session;
  const used = budget();
  let last = "";
  const stream = await client.beta.sessions.events.stream(id);
  await client.beta.sessions.events.send(id, { events: [{ type: "user.message", content: [{ type: "text", text: String(history.at(-1)?.content) }] }] });
  for await (const event of stream) {
    if (event.type === "agent.message") {
      last = event.content.map((block) => (block.type === "text" ? block.text : "")).join("");
      agent.log(`\nai> ${last}`);
    }
    if (event.type === "agent.custom_tool_use") await answer(id, event.id, event.name, event.input, agent);
    if (event.type === "agent.thread_context_compacted") agent.log("\n! compacted: older turns are now a summary");
    if (event.type === "session.error") agent.log(`\n! ${event.error.type}`);
    if (event.type === "span.model_request_end") used.count(cost(event.model_usage, agent.log));
    // Our caps still hold: past them, interrupt the session instead of calling the model again.
    if (event.type === "span.model_request_end" && used.spent()) {
      agent.log(`\n! stopped after ${used}. Say "go on" to continue.`);
      await client.beta.sessions.events.send(id, { events: [{ type: "user.interrupt" }] });
    }
    // Idle and waiting on one of our tools is not done. Idle for any other reason is.
    if (event.type === "session.status_idle" && event.stop_reason?.type !== "requires_action") return last;
    if (event.type === "session.status_terminated") return last;
  }
  return last;
}

// The same runTool as before, so the gate still asks. Only the result's envelope changed.
async function answer(id: string, toolUseId: string, name: string, input: Input, agent: Agent) {
  agent.log(`  ↳ ${name} ${JSON.stringify(input).slice(0, 200)}`);
  const result = await runTool(agent.tools, name, input).then(
    (text) => ({ text, is_error: false }),
    (error) => ({ text: String(error), is_error: true }),
  );
  await client.beta.sessions.events.send(id, {
    events: [{ type: "user.custom_tool_result", custom_tool_use_id: toolUseId, content: [{ type: "text", text: result.text }], is_error: result.is_error }],
  });
}
