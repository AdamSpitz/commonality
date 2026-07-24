import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverTypeScriptSourceRoots } from "./circular-deps-workspaces.mjs";

function fixture(rootPackage) {
  const root = mkdtempSync(path.join(os.tmpdir(), "circular-deps-workspaces-"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify(rootPackage));
  return root;
}

function addWorkspace(root, name, { packageJson = {}, sourceFile } = {}) {
  mkdirSync(path.join(root, name), { recursive: true });
  writeFileSync(path.join(root, name, "package.json"), JSON.stringify(packageJson));
  if (sourceFile) {
    mkdirSync(path.join(root, name, "src"));
    writeFileSync(path.join(root, name, "src", sourceFile), "export {};\n");
  }
}

test("discovers TypeScript src roots from workspace globs and reports skipped workspaces", () => {
  const root = fixture({ workspaces: ["packages/*"] });
  addWorkspace(root, "packages/app", { sourceFile: "index.ts" });
  addWorkspace(root, "packages/javascript", { sourceFile: "index.js" });
  addWorkspace(root, "packages/scripts");

  assert.deepEqual(discoverTypeScriptSourceRoots(root, {}), {
    roots: ["packages/app/src"],
    skipped: [
      { workspace: "packages/javascript", reason: "src/ contains no .ts or .tsx files", excluded: false },
      { workspace: "packages/scripts", reason: "no src/ directory", excluded: false },
    ],
    errors: [],
  });
});

test("reports explicit exclusions and malformed workspace manifests", () => {
  const root = fixture({ workspaces: { packages: ["good", "excluded", "broken"] } });
  addWorkspace(root, "good", { sourceFile: "index.tsx" });
  addWorkspace(root, "excluded", { sourceFile: "index.ts" });
  mkdirSync(path.join(root, "broken"));
  writeFileSync(path.join(root, "broken", "package.json"), "not json");

  const result = discoverTypeScriptSourceRoots(root, { excluded: "fixture exclusion" });
  assert.deepEqual(result.roots, ["good/src"]);
  assert.deepEqual(result.skipped, [{ workspace: "excluded", reason: "fixture exclusion", excluded: true }]);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].workspace, "broken");
  assert.match(result.errors[0].error, /cannot read package\.json/);
});

test("reports an invalid root workspace configuration", () => {
  const root = fixture({ private: true });
  const result = discoverTypeScriptSourceRoots(root, {});
  assert.deepEqual(result.roots, []);
  assert.deepEqual(result.skipped, []);
  assert.match(result.errors[0].error, /must define workspaces/);
});
