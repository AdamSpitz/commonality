import {
  type SDKMachinery,
  type IpfsCidV1,
  getAllStatements,
  getStatementWithContent,
} from '@commonality/sdk';
import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import {
  publishCuratedCollection,
  type CuratedCollectionEntry,
} from '@commonality/nudger-core';
import type { ExplorerCuratorConfig } from './config.js';

interface CuratedMapEntry {
  cid: string;
  label: string;
  topicArea: string;
  parentCid?: string;
  statementText: string;
}

interface CuratorResponse {
  entries: Array<{
    cid: string;
    label: string;
    topicArea: string;
    parentCid?: string;
  }>;
  changed: boolean;
  summary: string;
}

export class ExplorerCurator {
  private previousEntries: CuratedMapEntry[] = [];

  async runCuratorCycle(
    machinery: SDKMachinery,
    config: ExplorerCuratorConfig
  ): Promise<{ published: boolean; entryCount: number; txHash?: string }> {
    console.log(`[${config.stream}] Starting curator cycle...`);

    const statements = await getAllStatements(machinery, { limit: 100 });
    console.log(`[${config.stream}] Found ${statements.length} statements to evaluate.`);

    if (statements.length === 0) {
      console.log(`[${config.stream}] No statements available. Skipping.`);
      return { published: false, entryCount: 0 };
    }

    const statementsWithContent = await Promise.all(
      statements.map(async (stmt) => {
        try {
          const withContent = await getStatementWithContent(machinery, stmt.cid);
          return {
            cid: stmt.cid,
            believerCount: stmt.believerCount,
            disbelieverCount: stmt.disbelieverCount,
            text: withContent?.content?.content ?? null,
          };
        } catch {
          return {
            cid: stmt.cid,
            believerCount: stmt.believerCount,
            disbelieverCount: stmt.disbelieverCount,
            text: null,
          };
        }
      })
    ).then((results) => results.filter((r) => r.text !== null));

    if (statementsWithContent.length === 0) {
      console.log(`[${config.stream}] No statements with resolvable content. Skipping.`);
      return { published: false, entryCount: 0 };
    }

    const previousEntriesJson = this.previousEntries.length > 0
      ? JSON.stringify(this.previousEntries.map((e) => ({ cid: e.cid, label: e.label, topicArea: e.topicArea })))
      : 'none (first run)';

    const prompt = `You are curating a map of fundable project areas for a civic engagement platform.

The platform has users posting statements about causes they care about. Your job is to maintain a non-redundant, well-organized map of the funding landscape — a small set of statements (dozens to low hundreds) that covers the space of fundable causes and project areas.

Given the current set of statements, produce a curated collection that:
1. Covers distinct funding/cause areas without redundancy (no five ways of saying the same thing)
2. Includes statements that are genuinely useful for understanding the landscape (not idiosyncratic personal statements)
3. Groups entries by topicArea for navigability
4. Uses parentCid sparingly for lightweight hierarchical hints within a topic area

${this.previousEntries.length > 0 ? `PREVIOUS COLLECTION (for comparison):\n${previousEntriesJson}` : 'This is the first run — build the initial collection.'}

Respond with a JSON object containing:
- "entries": array of {cid, label, topicArea, parentCid?} for the curated collection
- "changed": boolean — true only if the collection has materially changed from the previous one
- "summary": brief explanation of what changed (or "initial collection" if first run)

"Materially changed" means: a genuinely new area added, a clearly better statement replacing an old one, or a meaningful reorganization. If nothing important has changed, set changed to false and keep the existing entries.`;

    const statementsJson = JSON.stringify(
      statementsWithContent.map((s) => ({
        cid: s.cid,
        text: s.text,
        believers: s.believerCount,
        disbelievers: s.disbelieverCount,
      }))
    );

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: 'You are a curator of civic engagement statements, organizing them into a navigable map of funding areas.',
      userPrompt: `${prompt}\n\nAVAILABLE STATEMENTS:\n${statementsJson}`,
      maxTokens: 8000,
      temperature: 0.2,
    };

    let response: CuratorResponse;
    try {
      response = await requestJsonCompletion<CuratorResponse>(request);
    } catch (error) {
      console.error(`[${config.stream}] Error from LLM:`, error);
      return { published: false, entryCount: this.previousEntries.length };
    }

    if (!response.changed && this.previousEntries.length > 0) {
      console.log(`[${config.stream}] No material changes. Keeping existing collection.`);
      return { published: false, entryCount: this.previousEntries.length };
    }

    const entries: CuratedCollectionEntry[] = response.entries.map((e) => ({
      cid: e.cid as IpfsCidV1,
      label: e.label,
      topicArea: e.topicArea,
      parentCid: e.parentCid as IpfsCidV1 | undefined,
    }));

    console.log(`[${config.stream}] Publishing collection with ${entries.length} entries. Summary: ${response.summary}`);

    try {
      const { txHash } = await publishCuratedCollection(config.stream, entries, config);
      console.log(`[${config.stream}] Published. tx: ${txHash}`);

      this.previousEntries = response.entries.map((e) => ({
        ...e,
        statementText: statementsWithContent.find((s) => s.cid === e.cid)?.text ?? '',
      }));

      return { published: true, entryCount: entries.length, txHash };
    } catch (error) {
      console.error(`[${config.stream}] Error publishing collection:`, error);
      return { published: false, entryCount: this.previousEntries.length };
    }
  }
}
