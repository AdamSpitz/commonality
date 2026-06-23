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

async function checkFile(relPath, repoRoot) {
  let content;
  try {
    content = await readFile(workspacePath(relPath), "utf8");
  } catch {
    return []; // missing source files are not this check's concern
  }
  return checkMarkdown({ relPath, content, repoRoot });
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

emit(async () => {
  // workspacePath("..") is the repo root (verifier workspace is one level inside repo)
  const repoRoot = workspacePath("..");
  const allBroken = [];
  const inputFiles = docsFileInputs();

  if (inputFiles.length > 0) {
    for (const input of inputFiles) {
      const broken = await checkInputFile(input, repoRoot);
      allBroken.push(...broken);
    }
  } else {
    for (const relPath of INPUT_FILES) {
      const broken = await checkFile(relPath, repoRoot);
      allBroken.push(...broken);
    }
  }

  if (allBroken.length === 0) {
    return pass("All relative links in the docs surface resolve to existing files.");
  }

  const lines = allBroken.map(
    ({ sourceFile, link, resolvedTarget, problem }) =>
      problem
        ? `  ${sourceFile}: ${problem}`
        : `  ${sourceFile}: [${link}] → ${resolvedTarget} (missing)`
  );
  return fail(
    `${allBroken.length} broken relative link${allBroken.length === 1 ? "" : "s"} found in docs surface.\n${lines.join("\n")}`,
    { brokenLinks: allBroken }
  );
});
