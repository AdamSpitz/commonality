import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const evidenceFile = process.env.COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE;

if (evidenceFile) {
  await mkdir(path.dirname(evidenceFile), { recursive: true });
  await writeFile(evidenceFile, JSON.stringify({
    checks: [
      { name: "fixture.endpoint", status: "fail", summary: "Synthetic endpoint evidence is unhealthy even though the command exits zero." }
    ]
  }), "utf8");
}

console.log("Fixture command exits successfully after writing unhealthy structured evidence.");
