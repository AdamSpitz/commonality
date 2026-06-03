import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function fileContent(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label} file: ${input.path}`);
  return input.content;
}

function codeSpans(markdown) {
  return [...markdown.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
}

function referencedTestFiles(markdown) {
  return [...new Set(codeSpans(markdown)
    .flatMap((span) => span.split(/\s*,\s*/))
    .map((span) => span.trim())
    .filter((span) => /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(span)))].sort();
}

function routeTableRows(markdown) {
  const routeSection = markdown.split("## Route-to-Test Mapping")[1]?.split("## Known Gaps")[0] ?? "";
  return routeSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Route | Vitest"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .map(([route, vitest, playwright]) => ({ route, vitest, playwright }));
}

async function walkFiles(dir) {
  const files = [];
  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) return visit(entryPath);
      files.push(entryPath);
      return undefined;
    }));
  }
  await visit(dir);
  return files;
}

async function existingFilesByRoot(root) {
  const absoluteRoot = workspacePath("..", root);
  const files = await walkFiles(absoluteRoot);
  return files.map((file) => path.relative(absoluteRoot, file).split(path.sep).join("/"));
}

function candidateRoots(reference) {
  if (reference.endsWith(".spec.ts") || reference.endsWith(".spec.tsx") || reference.endsWith(".spec.js") || reference.endsWith(".spec.jsx")) {
    return ["ui/e2e", "ui/src"];
  }
  return ["ui/src", "ui/e2e"];
}

function findMatches(reference, filesByRoot) {
  const roots = candidateRoots(reference);
  for (const root of roots) {
    const files = filesByRoot[root] ?? [];
    const matches = reference.includes("/")
      ? files.filter((file) => file === reference || file.endsWith(`/${reference}`))
      : files.filter((file) => path.posix.basename(file) === reference);
    if (matches.length > 0) return matches.map((file) => `${root}/${file}`);
  }
  return [];
}

async function pathExists(rootRelativePath) {
  try {
    await access(workspacePath("..", rootRelativePath));
    return true;
  } catch {
    return false;
  }
}

async function validatePlan(markdown) {
  const filesByRoot = {
    "ui/src": await existingFilesByRoot("ui/src"),
    "ui/e2e": await existingFilesByRoot("ui/e2e")
  };
  const testRefs = referencedTestFiles(markdown);
  const missingTestRefs = testRefs
    .map((reference) => ({ reference, matches: findMatches(reference, filesByRoot) }))
    .filter((entry) => entry.matches.length === 0)
    .map((entry) => entry.reference);

  const routes = routeTableRows(markdown);
  const malformedRouteRows = routes
    .filter((row) => !/^`\/.*`(?: \([^)]*\))?$/.test(row.route))
    .map((row) => row.route);
  const rowsWithNoCoverage = routes
    .filter((row) => row.vitest === "—" && row.playwright === "—")
    .map((row) => row.route);

  const requiredSections = [
    "## Unit Test Coverage Inventory",
    "## E2E Test Coverage (Playwright)",
    "## Route-to-Test Mapping",
    "## Known Gaps"
  ];
  const missingSections = requiredSections.filter((section) => !markdown.includes(section));
  const uiPlanExists = await pathExists("ui/test-plan.md");

  return {
    testRefs,
    missingTestRefs,
    routeRows: routes.length,
    malformedRouteRows,
    rowsWithNoCoverage,
    missingSections,
    uiPlanExists
  };
}

emit(async () => {
  const inputs = readInputs();
  const markdown = fileContent(findFileInput(inputs, "uiTestPlan"), "UI test plan");
  const findings = await validatePlan(markdown);
  const problems = [
    ...findings.missingSections.map((section) => `Missing required section: ${section}`),
    ...findings.missingTestRefs.map((reference) => `Referenced test file does not exist under ui/src or ui/e2e: ${reference}`),
    ...findings.malformedRouteRows.map((route) => `Malformed route table entry: ${route}`),
    ...findings.rowsWithNoCoverage.map((route) => `Route table entry has neither Vitest nor Playwright coverage: ${route}`),
    ...(findings.uiPlanExists ? [] : ["ui/test-plan.md does not exist."])
  ];

  const resultFindings = { ...findings, problems };
  if (problems.length > 0) {
    return fail(`UI test-plan drift check found ${problems.length} problem(s).`, { findings: resultFindings });
  }

  return pass(
    `UI test-plan references ${findings.testRefs.length} existing test file(s) across ${findings.routeRows} route mapping row(s).`,
    { findings: resultFindings }
  );
});
