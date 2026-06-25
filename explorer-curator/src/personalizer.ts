import { getStatement } from '@commonality/sdk/conceptspace';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { getCuratedCollections } from '@commonality/sdk/nudger-publications';
import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import type { ExplorerCuratorConfig } from './config.js';

export interface ExplorerSuggestion {
  cid: string;
  reason: string;
}

export interface ExplorerSuggestRequest {
  stream: string;
  signedStatementCids: string[];
}

export interface PersonalizerDependencies {
  getCuratedCollections: typeof getCuratedCollections;
  getStatement: typeof getStatement;
  requestJsonCompletion: <T>(request: OpenRouterJsonRequest) => Promise<T>;
}

function defaultPersonalizerDependencies(): PersonalizerDependencies {
  return {
    getCuratedCollections,
    getStatement,
    requestJsonCompletion,
  };
}

export async function suggestForUser(
  machinery: SDKMachinery,
  request: ExplorerSuggestRequest,
  config: ExplorerCuratorConfig,
  deps?: Partial<PersonalizerDependencies>
): Promise<ExplorerSuggestion[]> {
  const resolvedDeps = { ...defaultPersonalizerDependencies(), ...deps };

  const collections = await resolvedDeps.getCuratedCollections(machinery, undefined, request.stream);

  if (collections.length === 0) {
    return [];
  }

  const latestCollection = collections[0];
  const entries = latestCollection.entries;

  if (entries.length === 0) {
    return [];
  }

  const signedStatements: Array<{ cid: string; text: string | null }> = await Promise.all(
    request.signedStatementCids.slice(0, 200).map(async (cid) => {
      try {
        const stmt = await resolvedDeps.getStatement(machinery, cid as any);
        return { cid, text: stmt ? 'signed' : null };
      } catch {
        return { cid, text: null };
      }
    })
  );

  const collectionJson = JSON.stringify(
    entries.map((e) => ({
      cid: e.cid,
      label: e.label,
      topicArea: e.topicArea,
    }))
  );

  const resolvedSigned = signedStatements.filter((s) => s.text !== null);
  const signedJson = resolvedSigned.length > 0 ? JSON.stringify(resolvedSigned) : null;

  const prompt = `A user is exploring causes on a civic engagement platform. They have already signed certain statements (expressing their beliefs). Given the curated collection of funding areas, suggest which ones to surface to this user.

Consider:
- Anti-correlations: Don't suggest statements that directly oppose what the user has already signed
- Redundancy: Don't suggest things the user has already effectively covered
- Prioritization: Suggest areas most likely to resonate given what they've already expressed
- Entry points: Include at least one broad entry-point statement

Return a JSON array of {cid, reason} for the statements to suggest (5-15 items). Each "reason" should be a brief, human-readable explanation of why this statement is being shown (e.g. "Broad entry point into housing-related causes" or "Fits with statements you've already signed about local government").

CURATED COLLECTION:
${collectionJson}

USER'S SIGNED STATEMENTS (CIDs):
${signedJson || '(none — first-time user, suggest broad entry points)'}

Respond with a JSON array only.`;

  const req: OpenRouterJsonRequest = {
    apiKey: config.openRouterApiKey,
    model: config.openRouterModel,
    systemPrompt: 'You are a helpful assistant that personalizes cause exploration for civic engagement users.',
    userPrompt: prompt,
    maxTokens: 2000,
    temperature: 0.3,
  };

  try {
    const suggestions = await resolvedDeps.requestJsonCompletion<ExplorerSuggestion[]>(req);
    return suggestions.filter(
      (s) => entries.some((e) => e.cid === s.cid) && s.reason && s.cid
    );
  } catch (error) {
    console.error('Error generating personalized suggestions:', error);
    return entries.slice(0, 10).map((e) => ({
      cid: e.cid,
      reason: `Explore the ${e.label} area`,
    }));
  }
}
