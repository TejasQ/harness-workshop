// The terminal: how the harness looks. Prompts, colours and a spinner all live in this one file, so
// the files that teach the agent stay plain text.
import { input } from "@inquirer/prompts";
import { styleText } from "node:util";
import ora from "ora";

// Spins whenever the harness is waiting: on the model, or on a tool.
const spinner = ora({ text: "thinking", color: "cyan", discardStdin: false });

// The next line the person types. Ctrl+C leaves cleanly.
export async function prompt() {
  spinner.stop();
  const line = await input({ message: "you" }).catch(() => process.exit(0));
  spinner.start();
  return line;
}

// Every line the agent prints comes through here, and its first mark decides its colour.
export function log(line: string) {
  spinner.stop();
  console.log(line.split("\n").map(paint).join("\n"));
  spinner.start();
}

function paint(part: string) {
  const [, bar = "", text = ""] = /^(\s*│ )?(.*)$/.exec(part) ?? [];
  const mark = text.trimStart();
  const look = mark.startsWith("ai>") ? styleText("cyan", text)
    : mark.startsWith("↳") ? styleText("yellow", text)
    : mark.startsWith("·") ? styleText("dim", text)
    : mark.startsWith("!") ? styleText("red", text)
    : text;
  return styleText("dim", bar) + look;
}
