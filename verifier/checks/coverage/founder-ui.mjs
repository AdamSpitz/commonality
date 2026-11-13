import { emit, fail, pass, readInputs } from "../lib/result.mjs";
import {
  FOUNDER_BRIEF_PATH,
  FOUNDER_SIDECAR_PATH,
  missingTestFiles,
  parseHeadings,
  readTextInput,
  validateSidecar,
} from "../lib/founder-ui.mjs";

// Mechanical gate: every ## / ### heading in the founder brief has a sidecar
// entry, and every bound test file exists. It does not judge whether the
// writeup is complete or whether a test actually exercises the paragraph.
// That is review.founder-ui-thoroughness.

emit(async () => {
  const inputs = readInputs();
  const brief = await readTextInput(inputs, "founderBrief", FOUNDER_BRIEF_PATH);
  const sidecar = JSON.parse(await readTextInput(inputs, "founderSidecar", FOUNDER_SIDECAR_PATH));
  const headings = parseHeadings(brief);
  if (headings.length === 0) throw new Error("Founder brief has no ## or ### headings.");

  const problems = [
    ...validateSidecar(sidecar, headings),
    ...await missingTestFiles(sidecar),
  ];
  const findings = {
    founderBrief: FOUNDER_BRIEF_PATH,
    headings: headings.map((heading) => heading.id),
    unbound: problems.filter((problem) => problem.includes("has no sidecar entry")),
    problems,
  };
  if (problems.length > 0) {
    return fail(`Founder UI wiring has ${problems.length} problem(s). Add a sidecar entry or a real test; do not rewrite the brief.`, { findings });
  }
  const tested = sidecar.headings.filter((entry) => entry.disposition === "tests").length;
  const deferred = sidecar.headings.length - tested;
  return pass(`Founder UI wiring covers ${sidecar.headings.length} heading(s): ${tested} bound to tests, ${deferred} explicitly untested.`, { findings });
});
