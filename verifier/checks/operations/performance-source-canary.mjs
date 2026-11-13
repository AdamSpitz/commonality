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

const STORAGE_CALL_PATTERN = /(?:(?:window|globalThis)(?:\.|\?\.))?(?:localStorage|sessionStorage)(?:(?:\.|\?\.)(?:getItem|setItem|removeItem|clear|key)|\s*(?:\?\.)?\[\s*["'](?:getItem|setItem|removeItem|clear|key)["']\s*\])\s*\(/g;
const RENDER_INIT_CALLEES = new Set(["useState", "useMemo"]);

function calleeNameBefore(content, parenIndex) {
  let i = parenIndex - 1;
  while (i >= 0 && /\s/.test(content[i])) i -= 1;
  if (content[i] === ">") {
    let depth = 0;
    while (i >= 0) {
      if (content[i] === ">") depth += 1;
      else if (content[i] === "<") {
        depth -= 1;
        if (depth === 0) {
          i -= 1;
          break;
        }
      }
      i -= 1;
    }
    while (i >= 0 && /\s/.test(content[i])) i -= 1;
  }
  const end = i + 1;
  while (i >= 0 && /[A-Za-z0-9_$]/.test(content[i])) i -= 1;
  return content.slice(i + 1, end);
}

function isRenderPathStorage(content, callIndex) {
  const functions = [];
  const parens = [];
  let braceDepth = 0;
  let i = 0;
  while (i < callIndex) {
    const rest = content.slice(i);
    if (rest.startsWith("//")) {
      const end = content.indexOf("\n", i);
      i = end === -1 ? content.length : end + 1;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 2;
      continue;
    }
    const quote = content[i];
    if (quote === "'" || quote === '"' || quote === "`") {
      i += 1;
      while (i < callIndex) {
        if (content[i] === "\\") {
          i += 2;
          continue;
        }
        if (quote === "`" && content[i] === "$" && content[i + 1] === "{") {
          i += 2;
          break;
        }
        if (content[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (content.startsWith("=>", i) || (content.startsWith("function", i) && !/[A-Za-z0-9_$]/.test(content[i + 8] ?? ""))) {
      const callee = parens.at(-1);
      const insideOpenFunction = functions.some((frame) => !frame.closed);
      const via = RENDER_INIT_CALLEES.has(callee) ? callee : insideOpenFunction ? "nested" : "component";
      functions.push({
        via,
        closed: false,
        paramsOpen: content.startsWith("function", i),
        bodyDepth: undefined
      });
      i += content.startsWith("=>", i) ? 2 : 8;
      continue;
    }
    if (content[i] === "(") {
      parens.push(calleeNameBefore(content, i));
      i += 1;
      continue;
    }
    if (content[i] === ")") {
      parens.pop();
      const pending = [...functions].reverse().find((frame) => !frame.closed && frame.paramsOpen);
      if (pending && parens.length === 0) pending.paramsOpen = false;
      i += 1;
      continue;
    }
    if (content[i] === "{") {
      braceDepth += 1;
      const pending = [...functions].reverse().find((frame) => !frame.closed && frame.bodyDepth === undefined && !frame.paramsOpen);
      if (pending && parens.length === 0) pending.bodyDepth = braceDepth;
      i += 1;
      continue;
    }
    if (content[i] === "}") {
      for (const frame of functions) {
        if (!frame.closed && frame.bodyDepth === braceDepth) frame.closed = true;
      }
      braceDepth -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }

  const enclosing = [...functions].reverse().find((frame) => !frame.closed);
  // A lazy useState/useMemo initializer is the normal client-only draft restore.
  // Only storage read directly in the component body blocks render.
  return enclosing?.via === "component";
}

function renderPathStorageMatches(content) {
  const matches = [];
  for (const match of content.matchAll(STORAGE_CALL_PATTERN)) {
    if (isRenderPathStorage(content, match.index)) matches.push(match[0]);
  }
  return [...new Set(matches)];
}

function renderReport({ maxSourceBytes, allowLargeFiles, allowSynchronousStorageFiles, largeFiles, allowedLargeFiles, synchronousStorageFindings, allowedSynchronousStorageFindings, totalFiles }) {
  const lines = [
    "# UI source performance canary",
    "",
    "Cheap static backstop for source-level performance risks. This does not replace bundle budgets or browser timing checks.",
    "",
    `- total source files scanned: ${totalFiles}`,
    `- max source file budget: ${maxSourceBytes} bytes`,
    `- allowed oversized files: ${allowLargeFiles.length}`,
    `- allowed synchronous storage files: ${allowSynchronousStorageFiles.length}`,
    "",
    "## Oversized source files",
    ""
  ];
  if (largeFiles.length === 0) lines.push("_None._");
  else for (const file of largeFiles) lines.push(`- ${file.path}: ${file.bytes} bytes`);
  lines.push("", "## Allowed oversized source files", "");
  if (allowedLargeFiles.length === 0) lines.push("_None._");
  else for (const file of allowedLargeFiles) lines.push(`- ${file.path}: ${file.bytes} bytes`);
  lines.push("", "## Synchronous localStorage/sessionStorage use during render-risk scan", "");
  if (synchronousStorageFindings.length === 0) lines.push("_None._");
  else for (const finding of synchronousStorageFindings) lines.push(`- ${finding.path}: ${finding.matches.join(", ")}`);
  lines.push("", "## Allowed synchronous storage findings", "");
  if (allowedSynchronousStorageFindings.length === 0) lines.push("_None._");
  else for (const finding of allowedSynchronousStorageFindings) lines.push(`- ${finding.path}: ${finding.matches.join(", ")}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  const sourceDir = workspacePath("..", params.sourceDir ?? "ui/src");
  const maxSourceBytes = Number(params.maxSourceBytes ?? 180_000);
  const allowLargeFiles = new Set(params.allowLargeFiles ?? []);
  const allowSynchronousStorageFiles = new Set(params.allowSynchronousStorageFiles ?? []);
  const files = await walk(sourceDir);
  const largeFiles = [];
  const allowedLargeFiles = [];
  const synchronousStorageFindings = [];
  const allowedSynchronousStorageFindings = [];

  await Promise.all(files.map(async (file) => {
    const info = await stat(file);
    const relative = rel(file);
    if (info.size > maxSourceBytes) {
      const finding = { path: relative, bytes: info.size };
      if (allowLargeFiles.has(relative)) allowedLargeFiles.push(finding);
      else largeFiles.push(finding);
    }

    if (/\.(tsx?|jsx?)$/.test(file) && !/\.test\.(tsx?|jsx?)$/.test(file)) {
      const content = await readFile(file, "utf8");
      const matches = renderPathStorageMatches(content);
      if (matches.length > 0 && /src\/.*(?:pages|components)\//.test(relative)) {
        const finding = { path: relative, matches };
        if (allowSynchronousStorageFiles.has(relative)) allowedSynchronousStorageFindings.push(finding);
        else synchronousStorageFindings.push(finding);
      }
    }
  }));

  largeFiles.sort((a, b) => b.bytes - a.bytes);
  allowedLargeFiles.sort((a, b) => b.bytes - a.bytes);
  synchronousStorageFindings.sort((a, b) => a.path.localeCompare(b.path));
  allowedSynchronousStorageFindings.sort((a, b) => a.path.localeCompare(b.path));
  const artifact = await writeTextArtifact(
    "performance-source-canary.md",
    renderReport({
      maxSourceBytes,
      allowLargeFiles: [...allowLargeFiles].sort(),
      allowSynchronousStorageFiles: [...allowSynchronousStorageFiles].sort(),
      largeFiles,
      allowedLargeFiles,
      synchronousStorageFindings,
      allowedSynchronousStorageFindings,
      totalFiles: files.length
    }),
    "text/markdown",
    "Cheap static UI source performance canary report."
  );

  const findings = {
    sourceDir: params.sourceDir ?? "ui/src",
    maxSourceBytes,
    allowLargeFiles: [...allowLargeFiles].sort(),
    allowSynchronousStorageFiles: [...allowSynchronousStorageFiles].sort(),
    largeFiles,
    allowedLargeFiles,
    synchronousStorageFindings,
    allowedSynchronousStorageFindings
  };
  const problems = [];
  if (largeFiles.length > 0) {
    problems.push(`${largeFiles.length} oversized source file(s) over the ${maxSourceBytes}-byte budget.`);
  }
  // Synchronous localStorage/sessionStorage access from page/component render
  // paths is a render-blocking perf footgun the scan already detects; gate on
  // it so the signal cannot go green while the footgun is present.
  if (synchronousStorageFindings.length > 0) {
    problems.push(`${synchronousStorageFindings.length} source file(s) with synchronous localStorage/sessionStorage access in page/component render paths.`);
  }
  if (problems.length > 0) {
    return fail(`UI source performance canary found ${problems.join(" ")}`, { findings, artifacts: [artifact] });
  }
  return pass(`UI source performance canary passed across ${files.length} source file(s).`, { findings, artifacts: [artifact] });
});
