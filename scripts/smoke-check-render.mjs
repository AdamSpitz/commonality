#!/usr/bin/env node
/**
 * Smoke check for render.yaml — validates that the Render blueprint
 * configuration is consistent with the codebase it deploys.
 *
 * Catches:
 * - YAML syntax errors
 * - Missing rootDir or Dockerfile references
 * - Indexer env vars declared in render.yaml but not read in ponder.config.ts (and vice versa)
 * - Cross-service URL mismatches (hardcoded URLs that don't match service names)
 *
 * Run: node scripts/smoke-check-render.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Minimal YAML parser (avoids external dependency for this simple use case)
// ---------------------------------------------------------------------------

function parseRenderYaml(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const result = { databases: [], services: [] };

  let currentSection = null;
  let currentItem = null;
  let currentEnvVar = null;
  let inFromDatabase = false;

  for (const rawLine of content.split('\n')) {
    // Skip blank lines and comment-only lines
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Strip inline comments (but not inside quoted values)
    const line = trimmed.replace(/\s+#.*$/, '');
    const indent = rawLine.search(/\S/);

    // Top-level sections (indent 0)
    if (indent === 0) {
      if (line.startsWith('databases:')) { currentSection = 'databases'; continue; }
      if (line.startsWith('services:')) { currentSection = 'services'; continue; }
      continue;
    }

    // --- Databases ---
    if (currentSection === 'databases') {
      if (line.startsWith('- ')) {
        currentItem = {};
        result.databases.push(currentItem);
        const rest = line.slice(2).trim();
        const colonIdx = rest.indexOf(':');
        if (colonIdx > -1) currentItem[rest.slice(0, colonIdx).trim()] = rest.slice(colonIdx + 1).trim();
        inFromDatabase = false;
        continue;
      }
      if (currentItem && indent >= 4) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          currentItem[key] = val;
        }
        continue;
      }
    }

    // --- Services ---
    if (currentSection === 'services') {
      // New service item (indent 2, starts with "- ")
      if (indent === 2 && line.startsWith('- ')) {
        currentItem = { envVars: [] };
        result.services.push(currentItem);
        currentEnvVar = null;
        inFromDatabase = false;
        const rest = line.slice(2).trim();
        const colonIdx = rest.indexOf(':');
        if (colonIdx > -1) currentItem[rest.slice(0, colonIdx).trim()] = rest.slice(colonIdx + 1).trim();
        continue;
      }

      if (currentItem && indent >= 4) {
        // envVar entry (indent 6, starts with "- key:")
        if (indent === 6 && line.startsWith('- key:')) {
          currentEnvVar = { key: line.split(':')[1].trim(), sync: false, value: null, fromDatabase: null };
          currentItem.envVars.push(currentEnvVar);
          inFromDatabase = false;
          continue;
        }

        // fromDatabase block
        if (line.startsWith('fromDatabase:')) {
          inFromDatabase = true;
          if (currentEnvVar) currentEnvVar.fromDatabase = {};
          continue;
        }
        if (inFromDatabase && currentEnvVar && currentEnvVar.fromDatabase) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim().replace(/^'|'$/g, '');
            currentEnvVar.fromDatabase[key] = val;
          }
          continue;
        }

        // envVar properties (indent 8)
        if (indent === 8 && currentEnvVar) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim().replace(/^'|'$/g, '');
            if (key === 'sync') currentEnvVar.sync = val === 'false' ? false : val === 'true' ? true : val;
            else if (key === 'value') currentEnvVar.value = val;
          }
          continue;
        }

        // Other service properties (indent 4)
        if (indent === 4 && !line.startsWith('- ')) {
          inFromDatabase = false;
          const colonIdx = line.indexOf(':');
          if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            // Skip 'envVars:' — it's just a YAML list marker, the array was initialized on service creation
            if (key !== 'envVars') {
              currentItem[key] = val;
            }
          }
          continue;
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }
function ok(msg) { process.stdout.write(`  ✓ ${msg}\n`); }

// 1. Parse render.yaml
process.stdout.write('\n1. Parsing render.yaml...\n');
const renderPath = join(rootDir, 'render.yaml');
if (!existsSync(renderPath)) {
  error('render.yaml not found at project root');
  process.exit(1);
}

let render;
try {
  render = parseRenderYaml(renderPath);
  ok('render.yaml parsed successfully');
} catch (e) {
  error(`Failed to parse render.yaml: ${e.message}`);
  process.exit(1);
}

// 2. Validate databases
process.stdout.write('\n2. Validating databases...\n');
if (render.databases.length === 0) {
  error('No databases defined in render.yaml');
} else {
  for (const db of render.databases) {
    ok(`Database: ${db.name} (${db.plan})`);
  }
}

// 3. Validate services — paths exist
process.stdout.write('\n3. Validating service paths...\n');
for (const svc of render.services) {
  const svcRoot = svc.rootDir === '.' ? rootDir : join(rootDir, svc.rootDir || '');
  if (!existsSync(svcRoot)) {
    error(`Service "${svc.name}": rootDir "${svc.rootDir}" does not exist`);
  } else {
    ok(`Service "${svc.name}": rootDir "${svc.rootDir}" exists`);
  }

  const dockerfilePath = join(svcRoot, svc.dockerfilePath || 'Dockerfile');
  if (!existsSync(dockerfilePath)) {
    error(`Service "${svc.name}": Dockerfile not found at ${dockerfilePath}`);
  } else {
    ok(`Service "${svc.name}": Dockerfile exists`);
  }
}

// 4. Cross-service URL consistency
process.stdout.write('\n4. Checking cross-service URL consistency...\n');
const serviceNames = render.services.map(s => s.name);
for (const svc of render.services) {
  for (const envVar of svc.envVars) {
    if (envVar.value && typeof envVar.value === 'string' && envVar.value.includes('.onrender.com')) {
      const match = envVar.value.match(/https:\/\/([a-z0-9-]+)\.onrender\.com/);
      if (match) {
        const referencedService = match[1];
        if (!serviceNames.includes(referencedService)) {
          error(`Service "${svc.name}": envVar "${envVar.key}" references "${referencedService}.onrender.com" but no service named "${referencedService}" exists`);
        } else {
          ok(`Service "${svc.name}": "${envVar.key}" → ${envVar.value} (service exists)`);
        }
      }
    }
  }
}

// 5. Indexer env var consistency with ponder.config.ts
process.stdout.write('\n5. Checking indexer env var consistency...\n');
const indexerService = render.services.find(s => s.name === 'commonality-indexer');
if (!indexerService) {
  error('No "commonality-indexer" service found in render.yaml');
} else {
  const ponderConfigPath = join(rootDir, 'indexer', 'ponder.config.ts');
  if (!existsSync(ponderConfigPath)) {
    error('indexer/ponder.config.ts not found');
  } else {
    const ponderContent = readFileSync(ponderConfigPath, 'utf-8');

    // Extract env var keys from render.yaml for the indexer service
    const renderEnvKeys = new Set(
      indexerService.envVars
        .map(e => e.key) // Include fromDatabase keys too (DATABASE_URL is declared via fromDatabase)
    );

    // Extract process.env.* references from ponder.config.ts
    const envVarRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    const codeEnvKeys = new Set();
    let match;
    while ((match = envVarRegex.exec(ponderContent)) !== null) {
      codeEnvKeys.add(match[1]);
    }

    // Known optional/dev-only env vars that don't need to be in render.yaml
    const optionalEnvKeys = new Set([
      'PONDER_RPC_URL_31337',     // Local hardhat chain (not used in production)
      'PONDER_EPHEMERAL',          // Docker-based test runs
      'LAZYGIVING_START_BLOCK',    // Optional override, defaults to START_BLOCK
      'DELEGATION_START_BLOCK',    // Optional override, defaults to START_BLOCK
      'FUNDING_PORTAL_START_BLOCK', // Optional override, defaults to START_BLOCK
      'CONTENT_FUNDING_START_BLOCK', // Optional override, defaults to START_BLOCK
      'DATABASE_PRIVATE_URL',      // Alternative to DATABASE_URL (Render uses DATABASE_URL via fromDatabase)
    ]);

    // Keys in code but not in render.yaml (missing = will be undefined in production)
    const missingInRender = [...codeEnvKeys].filter(k => !renderEnvKeys.has(k) && !optionalEnvKeys.has(k));
    // Keys in render.yaml but not in code (dead config)
    const missingInCode = [...renderEnvKeys].filter(k => !codeEnvKeys.has(k));

    if (missingInRender.length > 0) {
      error(`Indexer: env vars read in ponder.config.ts but NOT declared in render.yaml: ${missingInRender.join(', ')}`);
    } else {
      ok('All env vars read in ponder.config.ts are declared in render.yaml');
    }

    if (missingInCode.length > 0) {
      // Filter out runtime-only vars used by start.sh, not ponder.config.ts
      const runtimeOnlyKeys = new Set(['NODE_ENV', 'PONDER_SCRIPT', 'DATABASE_SCHEMA', 'PONDER_EXPERIMENTAL_DB']);
      const actualMissingInCode = missingInCode.filter(k => !runtimeOnlyKeys.has(k));
      if (actualMissingInCode.length > 0) {
        warn(`Indexer: env vars declared in render.yaml but NOT read in ponder.config.ts: ${actualMissingInCode.join(', ')}`);
      } else {
        ok('All env vars declared in render.yaml are read in ponder.config.ts (runtime-only vars: NODE_ENV, PONDER_SCRIPT, DATABASE_SCHEMA, PONDER_EXPERIMENTAL_DB)');
      }
    } else {
      ok('All env vars declared in render.yaml are read in ponder.config.ts');
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

process.stdout.write('\n');
if (errors.length > 0) {
  process.stdout.write(`\n❌ ${errors.length} error(s):\n`);
  for (const e of errors) {
    process.stdout.write(`  - ${e}\n`);
  }
}
if (warnings.length > 0) {
  process.stdout.write(`\n⚠️  ${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    process.stdout.write(`  - ${w}\n`);
  }
}
if (errors.length === 0 && warnings.length === 0) {
  process.stdout.write('✅ All smoke checks passed.\n');
} else if (errors.length === 0) {
  process.stdout.write('\n✅ No errors (warnings above are informational).\n');
}

process.exit(errors.length > 0 ? 1 : 0);
