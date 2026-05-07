#!/usr/bin/env node
/**
 * Script to replace parseEther with parseUnits(..., 6) in test files
 * for payment-token-related amounts.
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = [
  'integration-tests/src/pubstarter/*.test.ts',
  'integration-tests/src/marketplace/*.test.ts',
  'integration-tests/src/fundingportal/*.test.ts',
  'integration-tests/src/workflows/*.test.ts',
  'integration-tests/src/actions/*.ts',
  'ui/e2e/*.spec.ts',
];

for (const pattern of files) {
  const paths = globSync(pattern, { cwd: '/home/adam/Projects/commonality' });
  for (const p of paths) {
    const fullPath = '/home/adam/Projects/commonality/' + p;
    let content = readFileSync(fullPath, 'utf-8');
    const original = content;

    // Replace parseEther('...') with parseUnits('...', 6)
    // Be careful not to match parseEther inside comments if possible
    content = content.replace(/parseEther\('([^']+)'\)/g, "parseUnits('$1', 6)");

    // Update import { parseEther } from 'viem' to include parseUnits
    if (content !== original) {
      content = content.replace(
        /import \{ parseEther(?!, parseUnits)\b/g,
        'import { parseEther, parseUnits'
      );
      content = content.replace(
        /import \{ parseEther, type Address \} from 'viem';/g,
        "import { parseEther, parseUnits, type Address } from 'viem';"
      );
      content = content.replace(
        /import \{ parseEther \} from 'viem';/g,
        "import { parseEther, parseUnits } from 'viem';"
      );
      writeFileSync(fullPath, content);
      console.log('Updated:', p);
    }
  }
}
