import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage", ".vite"].includes(entry.name)) return;
      await walk(fullPath, files);
      return;
    }
    if (/\.(tsx?|jsx?|css)$/.test(entry.name)) files.push(fullPath);
  }));
  return files;
}

function rel(file) {
  return path.relative(workspacePath(".."), file);
}

function renderReport({ maxSourceBytes, largeFiles, synchronousStorageFindings, totalFiles }) {
  const lines = [
    "# UI source performance canary",
    "",
    "Cheap static backstop for source-level performance risks. This does not replace bundle budgets or browser timing checks.",
    "",
    `- total source files scanned: ${totalFiles}`,
    `- max source file budget: ${maxSourceBytes} bytes`,
    "",
    "## Oversized source files",
    ""
  ];
  if (largeFiles.length === 0) lines.push("_None._");
  else for (const file of largeFiles) lines.push(`- ${file.path}: ${file.bytes} bytes`);
  lines.push("", "## Synchronous localStorage/sessionStorage use during render-risk scan", "");
  if (synchronousStorageFindings.length === 0) lines.push("_None._");
  else for (const finding of synchronousStorageFindings) lines.push(`- ${finding.path}: ${finding.matches.join(", ")}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  const sourceDir = workspacePath("..", params.sourceDir ?? "ui/src");
  const maxSourceBytes = Number(params.maxSourceBytes ?? 180_000);
  const allowLargeFiles = new Set(params.allowLargeFiles ?? []);
  const files = await walk(sourceDir);
  const largeFiles = [];
  const synchronousStorageFindings = [];

  await Promise.all(files.map(async (file) => {
    const info = await stat(file);
    const relative = rel(file);
    if (info.size > maxSourceBytes && !allowLargeFiles.has(relative)) {
      largeFiles.push({ path: relative, bytes: info.size });
    }

    if (/\.(tsx?|jsx?)$/.test(file) && !/\.test\.(tsx?|jsx?)$/.test(file)) {
      const content = await readFile(file, "utf8");
      const matches = [...new Set((content.match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(/g) ?? []))];
      if (matches.length > 0 && /src\/.*(?:pages|components)\//.test(relative)) {
        synchronousStorageFindings.push({ path: relative, matches });
      }
    }
  }));

  largeFiles.sort((a, b) => b.bytes - a.bytes);
  synchronousStorageFindings.sort((a, b) => a.path.localeCompare(b.path));
  const artifact = await writeTextArtifact(
    "performance-source-canary.md",
    renderReport({ maxSourceBytes, largeFiles, synchronousStorageFindings, totalFiles: files.length }),
    "text/markdown",
    "Cheap static UI source performance canary report."
  );

  const findings = { sourceDir: params.sourceDir ?? "ui/src", maxSourceBytes, largeFiles, synchronousStorageFindings };
  if (largeFiles.length > 0) {
    return fail(`UI source performance canary found ${largeFiles.length} oversized source file(s).`, { findings, artifacts: [artifact] });
  }
  return pass(`UI source performance canary passed across ${files.length} source file(s).`, { findings, artifacts: [artifact] });
});
