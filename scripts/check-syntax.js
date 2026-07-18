import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  ".agents",
  ".claude",
  ".playwright-mcp",
  ".superpowers",
  "node_modules",
]);

function collectJavaScript(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectJavaScript(absolute));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
  return files;
}

const failures = [];
for (const file of collectJavaScript(root)) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push(`${path.relative(root, file)}\n${result.stderr.trim()}`);
  }
}

for (const file of ["package.json", "manifest.webmanifest"]) {
  try {
    JSON.parse(readFileSync(path.join(root, file), "utf8"));
  } catch (error) {
    failures.push(`${file}\n${error.message}`);
  }
}

if (failures.length) {
  console.error(`Syntaxprüfung fehlgeschlagen:\n\n${failures.join("\n\n")}`);
  process.exitCode = 1;
} else {
  console.log("JavaScript und JSON sind syntaktisch gültig.");
}
