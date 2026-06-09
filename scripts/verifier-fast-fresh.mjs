#!/usr/bin/env node

import { spawn } from 'node:child_process'

const checks = [
  'automated.lint',
  'automated.build',
  'automated.test-fast',
  'automated.indexer-integrity-canaries',
  'ai-fixtures.deterministic',
  'validation.pr',
]

function runCheck(checkId) {
  return new Promise((resolve) => {
    console.error(`\n=== verifier-run ${checkId} ===`)
    const child = spawn('verifier-run', [checkId], { stdio: 'inherit' })
    child.on('close', (code, signal) => resolve({ checkId, code, signal }))
    child.on('error', (error) => {
      console.error(`Failed to start verifier-run ${checkId}: ${error.message}`)
      resolve({ checkId, code: 1, signal: null })
    })
  })
}

let firstFailure = null
for (const checkId of checks) {
  const result = await runCheck(checkId)
  if (result.code !== 0 || result.signal) {
    firstFailure = result
    break
  }
}

if (firstFailure) {
  const detail = firstFailure.signal ? `signal ${firstFailure.signal}` : `exit code ${firstFailure.code}`
  console.error(`\nverifier:fast stopped at ${firstFailure.checkId} (${detail}).`)
  process.exit(firstFailure.code || 1)
}
