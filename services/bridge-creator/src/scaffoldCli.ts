import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { scaffoldMediatorConfig } from './mediatorConfig.js';

interface ScaffoldSuggestions {
  identity: { name: string; description: string };
  labels: { sideA: string; sideB: string };
  anchorClusters: Array<{ topicTag: string; sideA: string; sideB: string; commonGround: string; rationale: string }>;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'bridge';
}

async function fetchSuggestions(url: string, foundingStatement: string, name?: string): Promise<ScaffoldSuggestions> {
  const response = await fetch(`${url.replace(/\/+$/, '')}/suggest-mediator-scaffold`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ foundingStatement, name }),
  });
  if (!response.ok) throw new Error(`Cause assist scaffold request failed (${response.status})`);
  return response.json() as Promise<ScaffoldSuggestions>;
}

export async function runScaffoldCli(argv: string[]): Promise<string> {
  const outputIndex = argv.indexOf('--output');
  const statementIndex = argv.indexOf('--founding-statement');
  const nameIndex = argv.indexOf('--name');
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : undefined;
  const statement = statementIndex >= 0 ? argv[statementIndex + 1] : undefined;
  const name = nameIndex >= 0 ? argv[nameIndex + 1] : undefined;
  const assistIndex = argv.indexOf('--cause-assist-url');
  const assistUrl = assistIndex >= 0 ? argv[assistIndex + 1] : process.env.CAUSE_ASSIST_URL;
  if (!output || !statement) {
    throw new Error('Usage: scaffold --founding-statement "..." --output mediator.json [--name "..."] [--cause-assist-url http://localhost:3002]');
  }
  const artifact = scaffoldMediatorConfig(statement, name);
  if (assistUrl) {
    const suggested = await fetchSuggestions(assistUrl, statement, name);
    artifact.name = suggested.identity.name;
    artifact.description = suggested.identity.description;
    if (suggested.labels.sideA && suggested.labels.sideB) artifact.labels = { side_a: suggested.labels.sideA, side_b: suggested.labels.sideB };
    const now = new Date().toISOString();
    artifact.anchors = suggested.anchorClusters.flatMap((cluster, index) => {
      const clusterId = `${slug(cluster.topicTag)}-${index + 1}`;
      return ([['side-a', cluster.sideA], ['side-b', cluster.sideB], ['common-ground', cluster.commonGround]] as const).map(([role, text]) => ({
        id: `${clusterId}-${role}`, cluster_id: clusterId, role, text, tally_cid: null,
        topic_tag: cluster.topicTag, rationale: cluster.rationale, status: 'proposed' as const,
        featured: false, created_at: now, last_reviewed_at: now,
      }));
    });
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runScaffoldCli(process.argv.slice(2)).then((path) => console.log(`Created ${path}`))
    .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
