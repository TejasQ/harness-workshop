// The coding domain. The tool list is the domain: these five make it a coding agent.
import { execSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { tool, type Tool } from "./tools.ts";

export const TOOLS: Tool[] = [
  tool("read_file", "Read a text file, by its path relative to the project root.", { path: "Like src/index.ts" }, async ({ path }) => await readFile(path, "utf8")),
  tool("list_files", "List the files in a folder.", { path: "A folder, like . or src" }, async ({ path }) => (await readdir(path, { recursive: true })).filter((file) => !file.includes("node_modules")).join("\n")),
  tool("write_file", "Create or overwrite a whole file.", { path: "The file", content: "Its full new content" }, async ({ path, content }) => {
    await writeFile(path, content);
    return `wrote ${path}`;
  }),
  tool("edit_file", "Replace one exact snippet in a file. old must appear exactly once.", { path: "The file", old: "The exact text to replace", new: "Its replacement" }, async ({ path, old, new: replacement }) => {
    const text = await readFile(path, "utf8");
    if (text.split(old).length !== 2) throw new Error("old must appear exactly once in the file");
    await writeFile(path, text.replace(old, replacement));
    return `edited ${path}`;
  }),
  tool("bash", "Run a shell command in the project root and return its output.", { command: "Like pnpm test" }, async ({ command }) => execSync(command, { encoding: "utf8", stdio: "pipe" })),
];
