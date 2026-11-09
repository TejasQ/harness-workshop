# Changelog

One entry per branch, newest first. `git diff <n-1> <n>` shows exactly what each entry describes.

## 5: phases

**Changed:** `runAgent(history, agent)` now takes an `Agent`: its system prompt, its tools and how it prints. A new `phases.ts` builds the `lead` agent, which gets one more tool, `run_phase(brief)`: it runs the same `runAgent` in a fresh, empty history and returns only a short note.

**Prompt:**

> Add phases. Give `runAgent` a second argument, `agent: { system, tools, log }`, and have it return its last text; `cost` and every print go through `agent.log`. In a new `phases.ts`, export `lead(system, tools, log)`, which returns an agent with the given tools plus `run_phase(brief)`. `run_phase` calls `runAgent` with a brand new history holding just the brief, a phase system prompt that asks for a note of at most five lines, the normal tools, and a `log` that indents every line with `  │ `, and returns that note. Tell the lead to plan big jobs as phases. In `harness.ts`, run `lead(SYSTEM, TOOLS, log)` with the terminal's `log`.

**Try:** "Two parts: find any bug in hello.ts, then count the lines in package.json. Use phases."

**Why:** success compounds per step. At 99% a step, one 120-step loop finishes 29% of the time; phases with a retry finish about 85%. Fresh context per phase is also the cheapest context.

## 4: context

**Changed:** a new `context.ts`: prompt caching and server compaction before 90k tokens (`CONTEXT`), tool results cut where they are made (`fit`), and the cost of every call printed (`cost`). `coding.ts` gets a stable `SYSTEM` prompt. `agent.ts` moves to `client.beta.messages.create` and spreads in `CONTEXT`.

**Prompt:**

> Add context management in a new `context.ts`. Export `CONTEXT`: top-level `cache_control: { type: "ephemeral" }`, `betas: ["compact-2026-01-12"]` and `context_management: { edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: 90000 } }] }`. Export `fit(output)`, which cuts any tool result over 12,000 characters with a note on how to ask for less; `runTool` returns `fit(...)`. Export `cost(usage)`, which prints prompt tokens, cached tokens and dollars at Haiku 5.5 prices ($0.10 in, $0.125 cache write, $0.01 cache read, $0.50 out per million; 5x for the whole request over 100k prompt tokens) and returns the tokens for the budget. In `agent.ts`, move to `client.beta.messages.create`, send a short fixed `SYSTEM` prompt from `coding.ts`, spread in `CONTEXT`, and say when a `compaction` block comes back.

**Try:** "Read every file here and summarise the project." Watch the cached count grow.

**Why:** the prompt is resent on every step, so it is the bill. Cache what never changes, shrink what comes in, compact before the price step.

## 3: guardrails

**Changed:** a new `guardrails.ts` with a `budget()` per task (`MAX_STEPS`, `MAX_TOKENS`) and a `gate()` that asks yes or no before `write_file`, `edit_file` and `bash`, with a `confirm()` from `terminal.ts`. `runAgent` checks the budget each step and says when a stop was `max_tokens` or `refusal`.

**Prompt:**

> Add guardrails in a new `guardrails.ts`. Export `budget()`, which counts model calls and tokens for one task and says when it passes 25 calls or 300,000 tokens; `runAgent` makes one per call, stops when it's spent and tells me how to continue. Export `gate(name, input)`: before `write_file`, `edit_file` or `bash` it asks me with a `confirm()` in `terminal.ts`, and on no it throws an error that tells the model to ask me what to do instead; `runTool` calls it first. Print a line when `stop_reason` is `max_tokens` or `refusal`.

**Try:** "Delete every file in this folder." Say no.

**Why:** the model proposes, the person decides. A cap turns a stuck loop into a pause, not a bill.

## 2: a tool registry

**Changed:** `tools.ts` now says what a tool is: `{ definition, run }`, built by one `tool()` helper, and `runTool(tools, name, input)` finds one by name. The tools themselves move to a new `coding.ts`: `read_file`, `list_files`, `write_file`, `edit_file` and `bash`. The loop in `agent.ts` only changes where it gets its tools.

**Prompt:**

> Make the tools a registry. In `tools.ts`, define `type Tool = { definition: Anthropic.Tool; run: (input) => Promise<string> }`, a helper `tool(name, description, fields, run)` that builds the JSON schema from `{ field: description }` with every field a required string, and `runTool(tools, name, input)` that finds the tool by name and runs it. Make a new `coding.ts` that exports `TOOLS`: `read_file(path)`, `list_files(path)` (recursive, skip node_modules), `write_file(path, content)`, `edit_file(path, old, new)` (old must appear exactly once) and `bash(command)`. Have `agent.ts` send `TOOLS`' definitions and run them with `runTool`.

**Try:** "Add hello.ts that prints today's date, then run it."

**Why:** the tool list is the domain. Five tools make a coding agent, and the descriptions are prompts: the model only knows what those strings say.

## 1: one tool

**Changed:** the model call moves out of `harness.ts` into `runAgent(messages)` in a new `agent.ts`, and becomes a loop that runs while `stop_reason` is `tool_use`. A new `tools.ts` holds `read_file` and `runTool(name, input)`. `runTools` gives every call exactly one `tool_result`, all in one user message, errors as `is_error`. `harness.ts` is now only the terminal loop, and a new `terminal.ts` is how it looks: an inquirer prompt, colours, and an ora spinner while it waits.

**Prompt:**

> Split the harness. Keep `harness.ts` as the terminal: it reads a line, pushes it, and calls `runAgent(messages)` from a new `agent.ts`. In `agent.ts`, `runAgent` calls the model in a `while (true)`, appends the response, prints its text, and returns when `stop_reason` isn't `"tool_use"`. Otherwise it pushes the result of `runTools(response.content)` as ONE user message and goes round again. `runTools` makes one `tool_result` per `tool_use` block (with `is_error: true` when it throws) and prints each call. Put the tools in `tools.ts`: one `read_file(path)` as an `Anthropic.Tool` with a JSON schema, and `runTool(name, input)`. Put everything about how the terminal looks in `terminal.ts`: `prompt()` with `input` from `@inquirer/prompts`, `log(line)` that colours a line by its first mark (`ai>`, `↳`, `·`, `!`) with `styleText` from `node:util`, and an `ora` spinner whenever it is waiting.

**Try:** "What does package.json depend on?"

**Why:** an agent is a loop around tool calls. The model never touches your disk. It asks; your code decides. One loop per file: the terminal loop is in `harness.ts`, the agent loop is in `agent.ts`, and the looks are in `terminal.ts`, out of the way.

## 0: the empty loop

**Changed:** new `harness.ts`. A terminal chat: one `messages` array, a `while (true)`, one model call per line you type.

**Prompt:**

> Write `harness.ts`, a TypeScript terminal chat with Claude using `@anthropic-ai/sdk`. Keep one `messages` array. In a `while (true)` loop, read a line from stdin, push it as a user message, call `client.messages.create` with model `claude-haiku-5-5` and `max_tokens: 16000`, push the response's whole `content` back as the assistant message (not just the text), and print the text blocks. No tools yet. Under 30 lines.

**Try:** "My name is Ada." then "What's my name?" Restart, ask again.

**Why:** the model is stateless. The harness owns the memory, and it only ever appends.
