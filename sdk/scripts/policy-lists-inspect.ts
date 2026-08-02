#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createPolicyEvaluator,
  parsePolicySubject,
  parseResolvedPolicyBundle,
  parseStrictJson,
} from '../src/policy-lists/index.js';

function usage(): never {
  console.error('Usage: policy-lists-inspect <active-bundle.json> [subject-json]');
  console.error('Example subject: {"type":"address","chainId":"8453","value":"0x..."}');
  process.exit(2);
}

const [, , bundleArgument, subjectArgument, ...extra] = process.argv;
if (bundleArgument === undefined || extra.length > 0) usage();

try {
  const bundle = parseResolvedPolicyBundle(parseStrictJson(await readFile(resolve(bundleArgument))));
  const layers = bundle.layers.map((layer) => ({
    id: layer.id,
    source: layer.ref?.source,
    status: layer.ref === undefined ? 'unresolved' : 'resolved',
    contentHash: layer.ref?.contentHash,
    exceptionStatus: layer.except === undefined
      ? 'not-configured'
      : layer.except.ref === undefined ? 'unresolved' : 'resolved',
    exceptionContentHash: layer.except?.ref?.contentHash,
    onError: layer.onError,
  }));
  const output: Record<string, unknown> = {
    digest: bundle.digest,
    sequence: bundle.sequence,
    layers,
  };

  if (subjectArgument !== undefined) {
    const subject = parsePolicySubject(parseStrictJson(new TextEncoder().encode(subjectArgument)));
    output.lookup = { subject, ...createPolicyEvaluator(bundle, 'current').lookup(subject) };
  }

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
