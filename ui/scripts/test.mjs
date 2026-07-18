#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
  return process.exitCode === 0
}

if (args.length > 0) {
  // `npm test --workspace=ui -- SomeComponent.test.tsx` is a common shorthand for a
  // focused unit/component test. Do not forward that Vitest filter to Playwright;
  // Playwright has a separate `npm run test:e2e --workspace=ui -- ...` entrypoint.
  run('npm', ['run', 'test:vitest', '--', ...args])
} else if (run('npm', ['run', 'test:vitest'])) {
  run('npm', ['run', 'test:e2e'])
}
