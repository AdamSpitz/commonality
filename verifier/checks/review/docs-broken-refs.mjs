import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

// Deterministic broken-reference scan over the same bounded docs surface as
// review.docs-coherence. Extracts relative Markdown links from each file and
// confirms the target path exists. No model calls; always returns pass or fail.
//
// Only relative local links are checked (http/https/mailto/# are skipped).
// Fragment-only links (#section) within the same file are also skipped since
// heading anchors can't be validated cheaply.
//
// The same pass also validates documented `npm run <script>` snippets against
// package.json scripts. That catches cheap docs drift deterministically instead
// of asking the docs-coherence LLM to infer whether a command name is stale.

const INPUT_FILES = [
  "../README.md",
  "../AGENTS.md",
  "../docs/dev/architecture.md",
  "../docs/end-user/tldr-for-llms.md",
  "../docs/founder/christian-pitch.md",
  "../ui/README.md",
  "../workflow/roles/README.md",
  "../workflow/roles/developer.md",
  "../workflow/roles/end-user.md",
  "../workflow/roles/founder.md",
  "../workflow/roles/product-manager.md",
  "../workflow/roles/tech-lead.md",
  "../workflow/local-development.md",
  "README.md",
  "DESIGN.md",
  "../specs/product/ui-domains.md",
  "../specs/tech/ui-domains.md",
  "../specs/tech/subsystems/subjectiv/README.md",
  "../.env.example",
  "../ui/.env.example",
];

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

function extractLinks(markdown) {
  const links = [];
  // Inline links: [text](url) or [text](url "title")
  const inlineRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = inlineRe.exec(markdown)) !== null) {
    const raw = m[1].trim().split(/\s+/)[0]; // strip optional title
    links.push(raw);
  }
  // Reference-style definitions: [label]: url
  const refDefRe = /^\s*\[[^\]]+\]:\s+(\S+)/gm;
  while ((m = refDefRe.exec(markdown)) !== null) {
    links.push(m[1].trim());
  }
  return links;
}

function extractNpmRunReferences(markdown) {
  const references = [];
  const npmRunRe = /\bnpm\s+run\s+([@\w:./-]+)([^`\n]*)/g;
  let m;
  while ((m = npmRunRe.exec(markdown)) !== null) {
    references.push({ script: m[1], suffix: (m[2] ?? "").split("#")[0] });
  }
  return references;
}

function shouldCheck(link) {
  if (!link) return false;
  if (link.startsWith("http://") || link.startsWith("https://")) return false;
  if (link.startsWith("mailto:")) return false;
  if (link.startsWith("#")) return false; // fragment-only
  return true;
}

function resolveTarget(link, fileDir, repoRoot) {
  const [pathPart] = link.split("#");
  if (!pathPart) return null; // fragment-only after stripping
  if (pathPart.startsWith("/")) {
    // Absolute paths are repo-root-relative (GitHub/MkDocs convention)
    return path.join(repoRoot, pathPart);
  }
  return path.resolve(fileDir, pathPart);
}

async function checkMarkdown({ relPath, content, repoRoot }) {
  const absPath = workspacePath(relPath);
  const fileDir = path.dirname(absPath);
  const broken = [];

  for (const link of extractLinks(content)) {
    if (!shouldCheck(link)) continue;
    const target = resolveTarget(link, fileDir, repoRoot);
    if (!target) continue;
    if (!(await fileExists(target))) {
      broken.push({
        sourceFile: relPath,
        link,
        resolvedTarget: path.relative(repoRoot, target),
      });
    }
  }
  return broken;
}

async function readDocFile(relPath) {
  try {
    return { relPath, content: await readFile(workspacePath(relPath), "utf8") };
  } catch {
    return null; // missing source files are not this check's concern
  }
}

function docsFileInputs() {
  return readInputs().filter((input) => input.kind === "file");
}

async function checkInputFile(input, repoRoot) {
  const relPath = input.path;
  if (input.content === null || input.content === undefined) {
    return [{
      sourceFile: relPath,
      link: null,
      resolvedTarget: relPath,
      problem: "source file input could not be read"
    }];
  }
  return checkMarkdown({ relPath, content: input.content, repoRoot });
}

function workspaceNameToPath(rootPackageJson) {
  const result = new Map();
  const workspaces = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : [];
  for (const workspace of workspaces) {
    const packageJson = workspacePackageJsons.get(workspace);
    if (packageJson?.name) result.set(packageJson.name, workspace);
    result.set(workspace, workspace);
  }
  return result;
}

const workspacePackageJsons = new Map();

function scriptWorkspace(reference, sourceFile) {
  const match = reference.suffix.match(/--workspace(?:=|\s+)([\w@./-]+)/);
  if (match) return match[1];
  const normalized = sourceFile.replace(/^\.\.\//, "");
  const workspace = [...workspacePackageJsons.keys()]
    .sort((a, b) => b.length - a.length)
    .find((candidate) => normalized === `${candidate}/README.md` || normalized.startsWith(`${candidate}/`));
  return workspace;
}

async function loadWorkspacePackageJsons(rootPackageJson) {
  workspacePackageJsons.clear();
  const workspaces = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : [];
  await Promise.all(workspaces.map(async (workspace) => {
    try {
      const content = await readFile(path.join(workspacePath(".."), workspace, "package.json"), "utf8");
      workspacePackageJsons.set(workspace, JSON.parse(content));
    } catch {
      // Missing workspace package files are not this check's concern; npm itself
      // and package-lock review catch broken workspace structure.
    }
  }));
}

async function validateNpmRunReferences({ docs }) {
  const rootPackageJson = JSON.parse(await readFile(workspacePath("../package.json"), "utf8"));
  await loadWorkspacePackageJsons(rootPackageJson);
  const missing = [];
  const workspacePathsByName = workspaceNameToPath(rootPackageJson);
  for (const { relPath, content } of docs) {
    for (const reference of extractNpmRunReferences(content)) {
      const command = `npm run ${reference.script}${reference.suffix}`.trim();
      if (command.includes("{") || command.includes("}")) continue;
      const workspace = scriptWorkspace(reference, relPath);
      let workspacePath = workspace ? workspacePathsByName.get(workspace) : null;
      let packageJson = workspace ? workspacePackageJsons.get(workspacePath) : rootPackageJson;
      if (!workspace && (!packageJson.scripts || !Object.hasOwn(packageJson.scripts, reference.script))) {
        const matchingWorkspaces = [...workspacePackageJsons]
          .filter(([, candidatePackageJson]) => candidatePackageJson.scripts && Object.hasOwn(candidatePackageJson.scripts, reference.script));
        if (matchingWorkspaces.length === 1) {
          workspacePath = matchingWorkspaces[0][0];
          packageJson = matchingWorkspaces[0][1];
        }
      }
      if (!packageJson) {
        missing.push({ sourceFile: relPath, command, problem: `unknown workspace ${workspace}` });
        continue;
      }
      if (!packageJson.scripts || !Object.hasOwn(packageJson.scripts, reference.script)) {
        missing.push({ sourceFile: relPath, command, problem: workspace ? `missing script in ${workspace}` : "missing root script" });
      }
    }
  }
  return missing;
}

emit(async () => {
  // workspacePath("..") is the repo root (verifier workspace is one level inside repo)
  const repoRoot = workspacePath("..");
  const allBroken = [];
  const docs = [];
  const inputFiles = docsFileInputs();

  if (inputFiles.length > 0) {
    for (const input of inputFiles) {
      if (input.content !== null && input.content !== undefined) {
        docs.push({ relPath: input.path, content: input.content });
      }
      const broken = await checkInputFile(input, repoRoot);
      allBroken.push(...broken);
    }
  } else {
    for (const relPath of INPUT_FILES) {
      const doc = await readDocFile(relPath);
      if (!doc) continue;
      docs.push(doc);
      allBroken.push(...await checkMarkdown({ relPath: doc.relPath, content: doc.content, repoRoot }));
    }
  }

  const brokenScriptReferences = await validateNpmRunReferences({ docs });

  if (allBroken.length === 0 && brokenScriptReferences.length === 0) {
    return pass("All relative links and documented npm run commands in the docs surface resolve.");
  }

  const linkLines = allBroken.map(
    ({ sourceFile, link, resolvedTarget, problem }) =>
      problem
        ? `  ${sourceFile}: ${problem}`
        : `  ${sourceFile}: [${link}] → ${resolvedTarget} (missing)`
  );
  const scriptLines = brokenScriptReferences.map(
    ({ sourceFile, command, problem }) => `  ${sourceFile}: ${command} (${problem})`
  );
  const sections = [];
  if (linkLines.length > 0) sections.push(`${allBroken.length} broken relative link${allBroken.length === 1 ? "" : "s"}:\n${linkLines.join("\n")}`);
  if (scriptLines.length > 0) sections.push(`${brokenScriptReferences.length} broken npm script reference${brokenScriptReferences.length === 1 ? "" : "s"}:\n${scriptLines.join("\n")}`);
  return fail(
    sections.join("\n"),
    { brokenLinks: allBroken, brokenScriptReferences }
  );
});
