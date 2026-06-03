import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseJsonInput(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label} file: ${input.path}`);
  return JSON.parse(input.content);
}

function fileContent(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label} file: ${input.path}`);
  return input.content;
}

async function collectCheckIds(dir) {
  const ids = new Set();
  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) return visit(entryPath);
      if (!entry.name.endsWith(".def.json")) return undefined;
      const def = JSON.parse(await readFile(entryPath, "utf8"));
      if (typeof def.id === "string") ids.add(def.id);
      return undefined;
    }));
  }
  await visit(dir);
  return ids;
}

async function fileExists(relativePath) {
  try {
    await access(workspacePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function allWorkflowCheckIds(workflow) {
  return [
    ...(workflow.workflowClarityCheckIds ?? []),
    ...(workflow.objectiveSmokeCheckIds ?? [])
  ];
}

async function validateWorkflow(workflow, index, knownCheckIds, productDoc) {
  const problems = [];
  const label = workflow?.id ?? `workflow at index ${index}`;
  if (!workflow || typeof workflow !== "object") return [`Workflow inventory item at index ${index} is not an object.`];
  if (typeof workflow.id !== "string" || workflow.id.length === 0) problems.push(`${label}: missing id.`);
  if (typeof workflow.title !== "string" || workflow.title.length === 0) problems.push(`${label}: missing title.`);
  if (typeof workflow.homeDomain !== "string" || workflow.homeDomain.length === 0) problems.push(`${label}: missing homeDomain.`);
  if (typeof workflow.goal !== "string" || workflow.goal.length === 0) problems.push(`${label}: missing goal.`);
  if (!Array.isArray(workflow.workflowClarityCheckIds) || workflow.workflowClarityCheckIds.length === 0) {
    problems.push(`${label}: must name at least one workflow-clarity check.`);
  }
  if (!Array.isArray(workflow.objectiveSmokeCheckIds) || workflow.objectiveSmokeCheckIds.length === 0) {
    problems.push(`${label}: must name at least one objective smoke/regression check backing up the subjective review.`);
  }
  if (!Array.isArray(workflow.surfaceFiles) || workflow.surfaceFiles.length === 0) {
    problems.push(`${label}: must list the bounded UI surface files supplied to the workflow-clarity reviewer.`);
  }
  if (workflow.title && !productDoc.includes(workflow.homeDomain) && !productDoc.includes(workflow.title.split(" ")[0])) {
    problems.push(`${label}: product domain source doc does not appear to mention this workflow's home domain/title.`);
  }

  for (const checkId of allWorkflowCheckIds(workflow)) {
    if (!knownCheckIds.has(checkId)) problems.push(`${label}: references nonexistent verifier check '${checkId}'.`);
  }
  for (const checkId of workflow.workflowClarityCheckIds ?? []) {
    if (!checkId.startsWith("review.workflow-clarity")) problems.push(`${label}: workflow clarity check '${checkId}' does not use the review.workflow-clarity namespace.`);
  }
  for (const surfaceFile of workflow.surfaceFiles ?? []) {
    if (typeof surfaceFile !== "string" || surfaceFile.length === 0) {
      problems.push(`${label}: surfaceFiles entries must be non-empty strings.`);
    } else if (!await fileExists(surfaceFile)) {
      problems.push(`${label}: surface file does not exist: ${surfaceFile}`);
    }
  }
  return problems;
}

emit(async () => {
  const inputs = readInputs();
  const inventory = parseJsonInput(findFileInput(inputs, "workflowsInventory"), "workflows inventory");
  const productDoc = fileContent(findFileInput(inputs, "uiDomainsDoc"), "UI domains source doc");
  if (!Array.isArray(inventory.workflows)) throw new Error("Workflow inventory must contain a workflows array.");

  const knownCheckIds = await collectCheckIds(workspacePath("checks"));
  const ids = new Set();
  const problems = [];

  for (const [index, workflow] of inventory.workflows.entries()) {
    problems.push(...await validateWorkflow(workflow, index, knownCheckIds, productDoc));
    if (workflow?.id) {
      if (ids.has(workflow.id)) problems.push(`${workflow.id}: duplicate workflow id.`);
      ids.add(workflow.id);
    }
  }

  const findings = {
    source: inventory.source,
    scope: inventory.scope,
    workflows: inventory.workflows.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      homeDomain: workflow.homeDomain,
      workflowClarityCheckIds: workflow.workflowClarityCheckIds ?? [],
      objectiveSmokeCheckIds: workflow.objectiveSmokeCheckIds ?? [],
      surfaceFiles: workflow.surfaceFiles ?? []
    })),
    problems
  };

  if (problems.length > 0) return fail(`Workflow coverage inventory has ${problems.length} problem(s).`, { findings });
  return pass(`Workflow coverage inventory maps ${inventory.workflows.length} key UI workflow(s).`, { findings });
});
