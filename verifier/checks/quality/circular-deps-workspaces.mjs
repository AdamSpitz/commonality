import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const EXCLUDED_WORKSPACES = {
  hardhat: "Solidity workspace; TypeScript/JavaScript files are support scripts rather than a src/ module graph.",
  "fake-data-generation": "TypeScript generators intentionally live at the workspace root rather than in src/.",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function workspacePatterns(rootPackage) {
  const workspaces = rootPackage.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (Array.isArray(workspaces?.packages)) return workspaces.packages;
  throw new Error("root package.json must define workspaces as an array or { packages: [] }");
}

export function discoverTypeScriptSourceRoots(repoRoot, exclusions = EXCLUDED_WORKSPACES) {
  const rootPackagePath = path.join(repoRoot, "package.json");
  let patterns;
  try {
    patterns = workspacePatterns(readJson(rootPackagePath));
  } catch (error) {
    return { roots: [], skipped: [], errors: [{ workspace: ".", error: error.message }] };
  }

  const workspaceDirs = [...new Set(patterns.flatMap((pattern) =>
    globSync(pattern, { cwd: repoRoot, exclude: ["**/node_modules/**"] })
      .filter((entry) => statSync(path.join(repoRoot, entry)).isDirectory())
  ))].sort();
  const roots = [];
  const skipped = [];
  const errors = [];

  for (const workspace of workspaceDirs) {
    if (exclusions[workspace]) {
      skipped.push({ workspace, reason: exclusions[workspace], excluded: true });
      continue;
    }

    const packagePath = path.join(repoRoot, workspace, "package.json");
    try {
      readJson(packagePath);
    } catch (error) {
      errors.push({ workspace, error: `cannot read package.json: ${error.message}` });
      continue;
    }

    const sourceRoot = path.join(workspace, "src");
    const absoluteSourceRoot = path.join(repoRoot, sourceRoot);
    if (!existsSync(absoluteSourceRoot)) {
      skipped.push({ workspace, reason: "no src/ directory", excluded: false });
      continue;
    }
    const hasTypeScript = globSync("**/*.{ts,tsx}", {
      cwd: absoluteSourceRoot,
      exclude: ["**/node_modules/**", "**/dist/**"],
    }).length > 0;
    if (!hasTypeScript) {
      skipped.push({ workspace, reason: "src/ contains no .ts or .tsx files", excluded: false });
      continue;
    }
    roots.push(sourceRoot);
  }

  return { roots, skipped, errors };
}
