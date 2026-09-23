import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { fundingContractNames } from "./contractCapabilities";

const indexerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const fundingAbiModules = [
  "AssuranceContractAbi",
  "AssuranceContractFactoryAbi",
  "PremintingERC1155FactoryAbi",
  "ProjectFactoryAbi",
  "PremintingERC1155Abi",
  "DelegatableNotesAbi",
  "RecurringPledgesAbi",
  "NoteIntentAbi",
  "ContentRegistryAbi",
  "BeneficiaryRegistryAbi",
  "BeneficiaryEscrowAbi",
  "CreatorAssuranceContractFactoryAbi",
  "CreatorAssuranceVetoAbi",
  "ProspectiveContentRoundFactoryAbi",
  "MaterializedContentTokensAbi",
  "fundingContracts",
];

function localImports(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((match) => match[1]!);
}

function walk(entry: string): string[] {
  const seen = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    if (!fs.existsSync(current)) continue;
    for (const specifier of localImports(current)) {
      const resolved = path.resolve(path.dirname(current), specifier);
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      pending.push(fs.existsSync(withTs) ? withTs : resolved);
    }
  }
  return [...seen];
}

test("conceptspace ponder config does not import funding ABIs", () => {
  const files = walk(path.join(indexerRoot, "ponder.conceptspace.config.ts"));
  const offenders = files.filter((file) =>
    fundingAbiModules.some((name) => file.includes(name)),
  );
  assert.deepEqual(offenders, []);
  const names = new Set(files.flatMap((file) => fs.readFileSync(file, "utf8").match(/[A-Za-z]+Abi/g) ?? []));
  for (const name of fundingContractNames) {
    assert.equal(files.some((file) => file.endsWith(`${name}.ts`)), false, name);
  }
  assert.equal(names.has("BeliefsAbi"), true);
  assert.equal(names.has("AssuranceContractAbi"), false);
});
