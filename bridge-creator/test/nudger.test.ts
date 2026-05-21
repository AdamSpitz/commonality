import assert from 'node:assert';
import type { DisplayableDocument, IpfsCidV1, SDKMachinery } from '@commonality/sdk';
import type { OpenRouterJsonRequest } from '@commonality/attester-core';
import type { BridgeCreatorConfig } from '../src/config.js';
import {
  BridgeCreatorNudger,
  type BridgeCreatorDependencies,
} from '../src/nudger.js';

function createTextDocument(content: string): DisplayableDocument {
  return {
    format: 'text/plain',
    content,
    assets: {},
    references: [],
    extras: {},
  };
}

function createConfig(overrides: Partial<BridgeCreatorConfig> = {}): BridgeCreatorConfig {
  const config: BridgeCreatorConfig = {
    nudgerPrivateKey: ('0x' + '11'.repeat(32)) as `0x${string}`,
    ethereumRpcUrl: 'http://localhost:8545',
    indexerUrl: 'http://localhost:3001',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    name: 'Bridge Creator',
    description: 'Test nudger',
    sourceType: 'bridge-creator',
    version: '0.1.0',
    nudgePublicationsContractAddress: ('0x' + '22'.repeat(20)) as `0x${string}`,
    commonalityStatements: [],
    trustedContextSources: [],
    anchorStorePath: 'bridge-creator/data/seed-anchors.json',
    strategyPromptUrl: '/strategy-prompt',
    publicBaseUrl: '',
  };
  return { ...config, ...overrides } as BridgeCreatorConfig;
}

function createDependencies(
  overrides: Partial<BridgeCreatorDependencies> = {},
): BridgeCreatorDependencies {
  return {
    getStatement: async () => ({ cid: 'bafy-source' as IpfsCidV1 }) as any,
    getAllStatements: async () => [],
    getStatementWithContent: async () => null,
    uploadToIPFS: async () => 'bafy-uploaded' as IpfsCidV1,
    requestJsonCompletion: async <T>() => ({}) as T,
    ...overrides,
  };
}

describe('BridgeCreatorNudger', () => {
  it('publishes modified and common-ground nudges for compatible candidates in confidence order', async () => {
    const uploadedDocs: DisplayableDocument[] = [];
    let uploadCounter = 0;

    const dependencies = createDependencies({
      getAllStatements: async () => [
        { cid: 'bafy-compatible' as IpfsCidV1 },
        { cid: 'bafy-duplicate' as IpfsCidV1 },
        { cid: 'bafy-missing' as IpfsCidV1 },
      ] as any,
      getStatementWithContent: async (_machinery, cid) => {
        if (cid === ('bafy-source' as IpfsCidV1)) {
          return { content: createTextDocument('Expand healthcare access') } as any;
        }
        if (cid === ('bafy-compatible' as IpfsCidV1)) {
          return { content: createTextDocument('Bipartisan limits with baseline coverage') } as any;
        }
        if (cid === ('bafy-duplicate' as IpfsCidV1)) {
          return { content: createTextDocument('Expand healthcare access') } as any;
        }
        if (cid === ('bafy-missing' as IpfsCidV1)) {
          throw new Error('ipfs unavailable');
        }
        return null;
      },
      uploadToIPFS: async (_ipfsConfig, doc) => {
        uploadedDocs.push(doc as DisplayableDocument);
        uploadCounter += 1;
        return `bafy-uploaded-${uploadCounter}` as IpfsCidV1;
      },
    });

    const nudger = new BridgeCreatorNudger(dependencies);
    (nudger as any).analyzeCompatibility = async (
      leftContent: string,
      rightContent: string,
    ) => {
      assert.strictEqual(leftContent, 'Expand healthcare access');
      if (rightContent === 'Bipartisan limits with baseline coverage') {
        return { leftCompatibleWithRight: true, rightCompatibleWithLeft: true };
      }
      if (rightContent === 'Shared safety net compromise') {
        return { leftCompatibleWithRight: true, rightCompatibleWithLeft: false };
      }
      return { leftCompatibleWithRight: false, rightCompatibleWithLeft: false };
    };
    (nudger as any).generateModifiedStatement = async (
      _originalContent: string,
      _polarity: 'left' | 'right',
      opposingContent: string,
    ) => `Modified for ${opposingContent}`;
    (nudger as any).generateCommonalityStatement = async (
      _leftContent: string,
      rightContent: string,
    ) => `Common ground with ${rightContent}`;

    const result = await nudger.generateNudges(
      { ipfsConfig: {} } as SDKMachinery,
      'bafy-source' as IpfsCidV1,
      createConfig({
        commonalityStatements: ['Shared safety net compromise'],
      })
    );

    assert.strictEqual(result.length, 4);
    assert.deepStrictEqual(result.map((nudge) => nudge.confidence), [0.9, 0.9, 0.7, 0.7]);

    assert.deepStrictEqual(
      result.map((nudge) => ({
        target: nudge.targetStatementCid,
        suggested: nudge.suggestedStatementCid,
      })),
      [
        { target: 'bafy-source', suggested: 'bafy-uploaded-1' },
        { target: 'bafy-uploaded-1', suggested: 'bafy-uploaded-2' },
        { target: 'bafy-source', suggested: 'bafy-uploaded-3' },
        { target: 'bafy-uploaded-3', suggested: 'bafy-uploaded-4' },
      ]
    );

    assert.strictEqual(uploadedDocs.length, 4);
    assert.deepStrictEqual(
      uploadedDocs.map((doc) => ({
        content: doc.content,
        createdBy: doc.extras?.createdBy,
        statement: doc.extras?.statement,
      })),
      [
        {
          content: 'Modified for Bipartisan limits with baseline coverage',
          createdBy: 'bridge-creator',
          statement: true,
        },
        {
          content: 'Common ground with Bipartisan limits with baseline coverage',
          createdBy: 'bridge-creator',
          statement: true,
        },
        {
          content: 'Modified for Shared safety net compromise',
          createdBy: 'bridge-creator',
          statement: true,
        },
        {
          content: 'Common ground with Shared safety net compromise',
          createdBy: 'bridge-creator',
          statement: true,
        },
      ]
    );
  });

  it('returns no nudges when the source statement cannot be loaded with content', async () => {
    const nudger = new BridgeCreatorNudger(createDependencies({
      getStatement: async () => ({ cid: 'bafy-source' as IpfsCidV1 }) as any,
      getStatementWithContent: async () => null,
    }));

    const result = await nudger.generateNudges(
      {} as SDKMachinery,
      'bafy-source' as IpfsCidV1,
      createConfig()
    );

    assert.deepStrictEqual(result, []);
  });

  it('returns a conservative incompatibility result when compatibility evaluation throws', async () => {
    const nudger = new BridgeCreatorNudger(createDependencies({
      requestJsonCompletion: async (_request: OpenRouterJsonRequest) => {
        throw new Error('llm unavailable');
      },
    }));

    const result = await nudger.analyzeCompatibility(
      'Left statement',
      'Right statement',
      createConfig()
    );

    assert.deepStrictEqual(result, {
      leftCompatibleWithRight: false,
      rightCompatibleWithLeft: false,
    });
  });

  it('passes the expected prompts into the LLM helpers', async () => {
    const requests: OpenRouterJsonRequest[] = [];
    const nudger = new BridgeCreatorNudger(createDependencies({
      requestJsonCompletion: async <T>(request: OpenRouterJsonRequest) => {
        requests.push(request);

        if (request.systemPrompt.includes('analyzing two political statements')) {
          return {
            leftCompatibleWithRight: true,
            rightCompatibleWithLeft: false,
            explanation: 'test',
          } as T;
        }

        if (request.systemPrompt.includes('helps create political bridge statements')) {
          return {
            modified_statement: 'Bridge wording',
            explanation: 'test',
          } as T;
        }

        return {
          commonality_statement: 'Shared compromise',
          explanation: 'test',
        } as T;
      },
    }));

    const config = createConfig();

    const compatibility = await nudger.analyzeCompatibility('Statement A', 'Statement B', config);
    const modified = await nudger.generateModifiedStatement(
      'Statement A',
      'left',
      'Statement B',
      config
    );
    const commonality = await nudger.generateCommonalityStatement(
      'Statement A',
      'Statement B',
      config
    );

    assert.deepStrictEqual(compatibility, {
      leftCompatibleWithRight: true,
      rightCompatibleWithLeft: false,
    });
    assert.strictEqual(modified, 'Bridge wording');
    assert.strictEqual(commonality, 'Shared compromise');
    assert.strictEqual(requests.length, 3);
    assert.match(requests[0]!.systemPrompt, /LEFT STATEMENT:\nStatement A/);
    assert.match(requests[0]!.systemPrompt, /RIGHT STATEMENT:\nStatement B/);
    assert.match(requests[1]!.userPrompt, /ORIGINAL STATEMENT \(center-left\):/);
    assert.match(requests[1]!.userPrompt, /OPPOSING STATEMENT \(center-right\):/);
    assert.match(requests[2]!.userPrompt, /LEFT-LEANING POSITION:/);
    assert.match(requests[2]!.userPrompt, /RIGHT-LEANING POSITION:/);
  });
});
