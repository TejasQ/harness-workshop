// The browser domain. A new domain is a new registry and new rules, nothing else: this file exports
// the same two things as coding.ts. Each tool is an HTTPS call to the person's own browser in the
// cloud, already logged in to their sites, with a script key from daiku.ai.
//
// There is no y/N gate here: none of these tools is on the gate's list in guardrails.ts. Daiku
// itself asks the person, on their phone, before anything sends, pays or deletes.
import { ask, handOver } from "./terminal.ts";
import { tool, type Input, type Tool } from "./tools.ts";

// Nothing here may change between calls, or the cache starts over.
export const SYSTEM = "You do errands for one person in their own browser in the cloud, already logged in to their sites. Open a workspace first and pass its id on every call; close it when done. Read pages with find and extract before you act. Before anything that changes the result for the person (which shop, which size, which date), ask them with ask_person. When only the person can do a step (a login, a code, a captcha), call request_human: it returns once they hand the browser back. Keep answers short.";

const DAIKU = process.env.DAIKU_URL ?? "https://daiku.ai";
const workspace = { type: "string", description: "The workspace id from workspace open, like w3" };

// One HTTPS call to the person's browser. Daiku answers with text, or an error the model can see.
async function call(name: string, input: Input) {
  const response = await fetch(`${DAIKU}/api/v1/tools/${name}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.DAIKU_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const answer = (await response.json()) as { isError?: boolean; text?: string; error?: string };
  if (!response.ok || answer.isError) throw new Error(answer.text ?? answer.error ?? `HTTP ${response.status}`);
  return answer.text ?? "";
}

function daiku(name: string, description: string, properties: Record<string, object>, required: string[], run = (input: Input) => call(name, input)): Tool {
  return { definition: { name, description, input_schema: { type: "object", properties: { ...properties, workspace }, required } }, run };
}

// The person's turn belongs to the harness, like ask_person: it shows them the link and waits for
// them itself. Left to the model, the link hides in a tool result and every wait is a silent step.
async function handToPerson(input: Input) {
  const handed = await call("request_human", input);
  const link = /^link: (\S+)/m.exec(handed)?.[1];
  if (!link) return handed;
  return await handOver(String(input.reason), link, async () => {
    let answer;
    do answer = await call("wait_for_human", { workspace: input.workspace });
    while (answer.includes("status: still_waiting"));
    return answer;
  });
}

export const TOOLS: Tool[] = [
  daiku("workspace", "Open your own workspace in the person's browser (action open, with a name), or close it when done.", { action: { type: "string", enum: ["open", "close"] }, name: { type: "string", description: "For open: the task in a few words" } }, ["action"]),
  daiku("navigate", "Open a URL in the workspace's tab. Returns a short page summary.", { url: { type: "string", description: "A full https URL" } }, ["url", "workspace"]),
  daiku("find", "Search the page for text, a role or a label. Returns matching lines with refs like e12.", { query: { type: "string" } }, ["query", "workspace"]),
  daiku("read_text", "Return the visible text inside one element, by its ref.", { ref: { type: "string", description: "Like e12" } }, ["ref", "workspace"]),
  daiku("extract", "Read rows from a table or listing as JSON, far cheaper than reading the text.", { ref: { type: "string", description: "The table or region" }, rows: { type: "string", description: "CSS selector for one row" }, fields: { type: "object", description: "Name to CSS selector inside a row, like { title: 'h3', link: 'a@href' }" } }, ["workspace"]),
  daiku("act", "Click, type, choose an option, press a key or scroll on the page.", { action: { type: "string", enum: ["click", "type", "select_option", "press_key", "scroll"] }, ref: { type: "string" }, description: { type: "string", description: "What you are doing, like 'Add to basket'" }, text: { type: "string" }, value: { type: "string" }, key: { type: "string" }, direction: { type: "string", enum: ["up", "down"] } }, ["action", "workspace"]),
  daiku("request_human", "Hand the person their browser for a step only they can do, like a login, a code or a captcha, on the page you have open. Returns when they hand it back.", { reason: { type: "string", description: "What they need to do, like 'Log in to Tesco'" } }, ["reason", "workspace"], handToPerson),
  daiku("wait_for_approval", "After needs_approval: wait for the person to approve on their phone, then call the same tool again.", { approval: { type: "string", description: "The approval link or id" } }, ["approval"]),
  // A checkpoint is the harness asking the person, not the model guessing.
  tool("ask_person", "Ask the person one short question when their answer changes the result. Returns their answer.", { question: "One question, with the options if there are any" }, async ({ question }) => await ask(question)),
];
