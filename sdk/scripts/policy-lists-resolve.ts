#!/usr/bin/env node
import { resolve } from 'node:path';
import { resolveAndActivateLocalPolicyBundle } from '../src/policy-lists/resolver-node.js';

function usage(): never {
  console.error('Usage: policy-lists-resolve <policy-root.json> <active-bundle.json>');
  process.exit(2);
}

const [, , rootArgument, bundleArgument, ...extra] = process.argv;
if (rootArgument === undefined || bundleArgument === undefined || extra.length > 0) usage();

try {
  const bundle = await resolveAndActivateLocalPolicyBundle(resolve(rootArgument), resolve(bundleArgument));
  console.log(JSON.stringify({ digest: bundle.digest, sequence: bundle.sequence }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
