/**
 * Generates a proliferation of similar-but-distinct statement variants around
 * the seed content, for testing the implication-attester and implication-finder.
 *
 * For each seed statement, generates:
 *   2 "close"   variants — same position, different phrasing (should imply original)
 *   2 "medium"  variants — same topic, somewhat different framing (might imply)
 *   1 "distant" variant  — related topic, different enough that probably no implication
 *
 * Output: seed-content/proliferation.json (saved incrementally after each group)
 *
 * Resume-safe: already-completed groups are skipped on re-run.
 *
 * Usage (OpenRouter):
 *   export OPENROUTER_API_KEY=sk-or-...
 *   npm run gen:proliferation
 *
 * Usage (Anthropic API directly):
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm run gen:proliferation
 */

import './loadEnv.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadSeedCollections,
  type SeedCollection,
  type SeedStatement,
  DEFAULT_SEED_CONTENT_DIR,
} from './seed-content-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, 'seed-content', 'proliferation.json');

// API config — prefer OpenRouter, fall back to Anthropic API
const USE_OPENROUTER = Boolean(process.env.OPENROUTER_API_KEY);
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-haiku';
const DELAY_MS = 500;

type SimilarityLevel = 'close' | 'medium' | 'distant';

interface RawVariant {
  similarity: SimilarityLevel;
  text: string;
}

async function callLLM(prompt: string): Promise<string> {
  if (USE_OPENROUTER) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://commonality.app',
        'X-Title': 'Commonality Seed Content Proliferation',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenRouter ${response.status}: ${err.error?.message ?? response.statusText}`);
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter');
    return content;
  } else {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Anthropic ${response.status}: ${err.error?.message ?? response.statusText}`);
    }
    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const content = data.content?.find((c) => c.type === 'text')?.text;
    if (!content) throw new Error('Empty response from Anthropic API');
    // Extract JSON from the response (may have surrounding text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Anthropic response');
    return jsonMatch[0];
  }
}

async function generateVariantsForStatement(
  statement: SeedStatement,
  groupTitle: string,
): Promise<SeedStatement[]> {
  const prompt = `You are generating test data for a system that discovers implications between political and social statements.

Given this original statement:
"${statement.text}"

Context: This statement is from a group about "${groupTitle}".

Generate exactly 5 variant statements:
- 2 "close" variants: A different phrasing of essentially the same position. Someone who agrees with the original would almost certainly agree with these. An implication arrow clearly exists between original and variant.
- 2 "medium" variants: Same topic and rough direction, but with meaningful differences in framing or strength. An implication arrow may or may not be appropriate.
- 1 "distant" variant: Related to the same broad topic, but a different enough position or angle that an implication arrow probably does not make sense.

Rules:
- Each variant must be a fully standalone statement (no "as above", "unlike the original", etc.)
- Match the approximate length, register, and first-person voice of the original
- The "distant" variant must still be something a real, reasonable person might say on this topic — not a strawman or extreme position
- Respond with JSON only, no other text

JSON format:
{
  "variants": [
    {"similarity": "close", "text": "..."},
    {"similarity": "close", "text": "..."},
    {"similarity": "medium", "text": "..."},
    {"similarity": "medium", "text": "..."},
    {"similarity": "distant", "text": "..."}
  ]
}`;

  const content = await callLLM(prompt);
  const parsed = JSON.parse(content) as { variants?: RawVariant[] };
  const variants = parsed.variants ?? [];

  return variants.map((v, i) => {
    const roleLabel = `variant-${v.similarity}`;
    // Use a sequential index within this similarity level
    const sameLevel = variants.slice(0, i).filter((x) => x.similarity === v.similarity).length + 1;
    return {
      id: `${statement.id}-${v.similarity}-${sameLevel}`,
      role: roleLabel,
      text: v.text,
      notes: [`Original: ${statement.id}`],
    };
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadExistingOutput(): Promise<{ collection: SeedCollection | null; doneGroupIds: Set<string> }> {
  try {
    const raw = JSON.parse(await fs.readFile(OUTPUT_FILE, 'utf8')) as SeedCollection;
    const doneGroupIds = new Set(raw.groups.map((g) => g.id));
    return { collection: raw, doneGroupIds };
  } catch {
    return { collection: null, doneGroupIds: new Set() };
  }
}

async function saveOutput(groups: SeedCollection['groups']): Promise<void> {
  const output: SeedCollection = {
    format: 'commonality-seed-content-v1',
    id: 'proliferation',
    title: 'Proliferated Statement Variants',
    description:
      'Similar-but-distinct variants of seed content statements, generated for testing the implication-attester and implication-finder systems.',
    notes: [
      'Generated by generateProliferation.ts using an LLM.',
      'Role "variant-close": very likely implies the original.',
      'Role "variant-medium": might imply the original; uncertain.',
      'Role "variant-distant": probably does not imply the original.',
      'Each statement\'s notes field records the original statement ID.',
    ],
    groups,
  };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

async function main(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('Error: set OPENROUTER_API_KEY or ANTHROPIC_API_KEY before running.');
    process.exit(1);
  }

  const { collection: existing, doneGroupIds } = await loadExistingOutput();
  const outputGroups: SeedCollection['groups'] = existing ? [...existing.groups] : [];

  if (doneGroupIds.size > 0) {
    console.log(`Resuming — ${doneGroupIds.size} group(s) already complete.`);
  }

  const collections = await loadSeedCollections(DEFAULT_SEED_CONTENT_DIR);

  // Count total statements for progress display
  let totalStatements = 0;
  for (const coll of collections) {
    for (const group of coll.groups) {
      if (!doneGroupIds.has(`${coll.id}-${group.id}`)) {
        totalStatements += group.statements.length;
      }
    }
  }

  let done = 0;
  const modelDisplay = USE_OPENROUTER ? `OpenRouter / ${OPENROUTER_MODEL}` : `Anthropic / ${ANTHROPIC_MODEL}`;
  console.log(`Statements to process: ${totalStatements}`);
  console.log(`Using model: ${modelDisplay}\n`);

  for (const coll of collections) {
    // Skip the proliferation file itself if it somehow gets loaded
    if (coll.id === 'proliferation') continue;

    for (const group of coll.groups) {
      const groupId = `${coll.id}-${group.id}`;

      if (doneGroupIds.has(groupId)) {
        console.log(`  skip  ${groupId}`);
        continue;
      }

      const allVariants: SeedStatement[] = [];

      for (const statement of group.statements) {
        console.log(`[${done + 1}/${totalStatements}] ${statement.text.slice(0, 70)}${statement.text.length > 70 ? '…' : ''}`);

        try {
          const variants = await generateVariantsForStatement(statement, group.title);
          allVariants.push(...variants);
          console.log(`         → ${variants.length} variants`);
        } catch (err) {
          console.error(`  ERROR for ${statement.id}:`, (err as Error).message);
        }

        done++;
        if (done < totalStatements) await sleep(DELAY_MS);
      }

      outputGroups.push({
        id: groupId,
        title: `Variants of "${group.title}"`,
        notes: [`Source: ${coll.id} / ${group.id}`],
        statements: allVariants,
      });

      // Save after every group so progress is not lost on interruption
      await saveOutput(outputGroups);
      console.log(`  saved ${allVariants.length} variants for group "${groupId}"\n`);
    }
  }

  console.log(`\nDone. Output: ${OUTPUT_FILE}`);
  console.log(`Groups: ${outputGroups.length}, Statements: ${outputGroups.reduce((n, g) => n + g.statements.length, 0)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
