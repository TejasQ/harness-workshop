# Changelog

One entry per branch, newest first. `git diff <n-1> <n>` shows exactly what each entry describes.

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
