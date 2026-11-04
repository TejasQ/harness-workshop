# Build a coding agent harness from an empty loop

Workshop code for AI Engineer Code Summit 2026. We start from an empty `while (true)` and build a
harness: tools, guardrails, context, phases, any model and a new domain. Then we rent the same loop
as an API, and see what we'd still write ourselves.

## Setup

```sh
git clone https://github.com/TejasQ/harness-workshop.git
cd harness-workshop
for n in 0 1 2 3 4 5 6 7 8; do git branch --track $n origin/$n; done   # a local branch per step
pnpm install
cp .env.example .env   # add ANTHROPIC_API_KEY, or run `ant auth login` instead
```

Node 22 or later and [pnpm](https://pnpm.io). Step 6 needs [Ollama](https://ollama.com). Step 7 needs a Daiku script key
(the Developers page on daiku.ai). Step 8 uses Claude Managed Agents, which every API account has.

## How to follow along

Every step is a branch: `0`, `1`, `2` … `8`. Each one adds one idea, and each idea lives in its own
file, so a step's diff is mostly one new file. Its `CHANGELOG.md` says what changed, the prompt that
gets you there, and what to try.

You don't need to check anything out to move forward. Stay on your own branch and build it:

```sh
git switch -c mine main       # once: an empty project (or `0` to skip the first step)
```

Then, for each step:

1. **Read the next entry:** `git show 3:CHANGELOG.md | head -20`
2. **Vibe code it:** paste that entry's prompt into your coding agent.
3. **Run it:** `pnpm start`
4. **Compare with the reference:** `git diff 3 -- '*.ts'` shows how your version differs from mine.
5. **See only what the step changed:** `git diff 2 3` is the whole lesson in one diff.
6. **Commit and keep going:** `git commit -am "step 3"`

Fell behind or broke it? Take the reference file and carry on:

```sh
git restore --source 3 -- .   # every file as it is on branch 3, your branch stays yours
git checkout 3                # or jump to the branch itself
```

## The branches

| Branch | Adds | New file |
| --- | --- | --- |
| `0` | The empty loop: one array of messages, one call per line | `harness.ts` |
| `1` | One tool, and the loop that runs while the model asks for tools | `agent.ts`, `tools.ts` |
| `2` | A tool registry: read, list, write, edit, bash | `coding.ts` |
| `3` | Guardrails: step and token caps, a gate before changes | `guardrails.ts` |
| `4` | Context: caching, results cut at the source, compaction, cost per call | `context.ts` |
| `5` | Phases: the same loop in a fresh context, returning a short note | `phases.ts` |
| `6` | Any model: IBM Granite on your laptop through Ollama | `model.ts` |
| `7` | A new domain: a real browser, logged in to your sites | `browser.ts` |
| `8` | Rent the loop: the same tools on Claude Managed Agents | `managed.ts` |

By the end, each file holds one idea:

| File | The idea |
| --- | --- |
| `harness.ts` | The terminal: read a line, hand it to the agent |
| `terminal.ts` | How the terminal looks: prompts, colours, a spinner |
| `agent.ts` | The loop: call the model, run the tools it asks for, repeat |
| `tools.ts` | What a tool is, and how the harness finds and runs one |
| `coding.ts`, `browser.ts` | A domain: its tools and its system prompt |
| `guardrails.ts` | Caps on steps and tokens, and a gate before changes |
| `context.ts` | Caching, compaction, cutting results, and the bill |
| `phases.ts` | A lead agent that hands parts of a job to fresh agents |
| `model.ts` | Which model, and where it runs |
| `managed.ts` | The same loop, rented: Anthropic runs it, our tools still run here |

`git log --oneline 8` shows the whole path.

## License

[MIT](LICENSE)
