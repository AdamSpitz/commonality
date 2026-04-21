import {
  type SDKMachinery,
  type IpfsCidV1,
  getStatement,
  getStatementWithContent,
  uploadToIPFS,
} from '@commonality/sdk';
import { type DisplayableDocument } from '@commonality/sdk';
import type { NudgeMessage, NudgerStrategy } from '@commonality/nudger-core';
import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import type { BridgeCreatorConfig } from './config.js';

export interface BridgeCandidate {
  leftStatement: {
    cid: IpfsCidV1;
    content: string;
  };
  rightStatement: {
    cid: IpfsCidV1;
    content: string;
  };
  compatibility: {
    leftCompatibleWithRight: boolean;
    rightCompatibleWithLeft: boolean;
  };
}

export class BridgeCreatorNudger implements NudgerStrategy<BridgeCreatorConfig> {
  name = 'bridge-creator';

  async generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: BridgeCreatorConfig
  ): Promise<NudgeMessage[]> {
    const sourceStatement = await getStatement(machinery, targetStatementCid);
    if (!sourceStatement) {
      return [];
    }

    const sourceStatementWithContent = await getStatementWithContent(machinery, targetStatementCid);
    if (!sourceStatementWithContent || !sourceStatementWithContent.content) {
      return [];
    }

    const sourceContent = this.extractContent(sourceStatementWithContent.content);

    const candidates = await this.findBridgeCandidates(
      machinery,
      targetStatementCid,
      sourceContent,
      config
    );

    const nudges: NudgeMessage[] = [];

    for (const candidate of candidates) {
      const modifiedStatement = await this.createModifiedVersion(
        candidate,
        sourceContent,
        config
      );

      if (!modifiedStatement) {
        continue;
      }

      const modifiedCid = await this.publishStatement(machinery, modifiedStatement);

      const confidence = this.calculateConfidence(candidate);

      nudges.push({
        targetStatementCid,
        suggestedStatementCid: modifiedCid,
        reason: `Modified version compatible with opposing side: "${modifiedStatement.substring(0, 100)}..."`,
        confidence,
      });

      const commonalityStatement = await this.createCommonalityStatement(
        candidate,
        config
      );

      if (commonalityStatement) {
        const commonalityCid = await this.publishStatement(machinery, commonalityStatement);

        nudges.push({
          targetStatementCid: modifiedCid,
          suggestedStatementCid: commonalityCid,
          reason: `This modified statement implies common ground: "${commonalityStatement.substring(0, 100)}..."`,
          confidence,
        });
      }
    }

    nudges.sort((a, b) => b.confidence - a.confidence);
    return nudges;
  }

  private extractContent(doc: DisplayableDocument): string {
    if (doc.format === 'text/plain') {
      return doc.content;
    }
    return doc.content;
  }

  private async publishStatement(machinery: SDKMachinery, content: string): Promise<IpfsCidV1> {
    const doc: DisplayableDocument = {
      format: 'text/plain',
      content,
      assets: {},
      references: [],
      extras: {
        statement: true,
        createdBy: 'bridge-creator',
      },
    };
    return uploadToIPFS(machinery.ipfsConfig as any, doc);
  }

  private async findBridgeCandidates(
    _machinery: SDKMachinery,
    _targetStatementCid: IpfsCidV1,
    _sourceContent: string,
    _config: BridgeCreatorConfig
  ): Promise<BridgeCandidate[]> {
    return [];
  }

  private async createModifiedVersion(
    _candidate: BridgeCandidate,
    _originalContent: string,
    _config: BridgeCreatorConfig
  ): Promise<string | null> {
    return null;
  }

  private async createCommonalityStatement(
    _candidate: BridgeCandidate,
    _config: BridgeCreatorConfig
  ): Promise<string | null> {
    return null;
  }

  private calculateConfidence(candidate: BridgeCandidate): number {
    if (candidate.compatibility.leftCompatibleWithRight && candidate.compatibility.rightCompatibleWithLeft) {
      return 0.9;
    } else if (candidate.compatibility.leftCompatibleWithRight || candidate.compatibility.rightCompatibleWithLeft) {
      return 0.7;
    }
    return 0.3;
  }

  async analyzeCompatibility(
    leftContent: string,
    rightContent: string,
    config: BridgeCreatorConfig
  ): Promise<{ leftCompatibleWithRight: boolean; rightCompatibleWithLeft: boolean }> {
    const prompt = `You are analyzing two political statements to determine if they are compatible (can both be true without conflicting).

LEFT STATEMENT:
${leftContent}

RIGHT STATEMENT:
${rightContent}

Analyze whether these statements can both be true simultaneously, or if they represent genuinely conflicting positions.
Respond with a JSON object indicating compatibility in either direction.`;

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: prompt,
      userPrompt: 'Is the left statement compatible with the right? Is the right compatible with the left? Also provide a brief explanation of your reasoning.',
    };

    interface CompatibilityResponse {
      leftCompatibleWithRight: boolean;
      rightCompatibleWithLeft: boolean;
      explanation: string;
    }

    try {
      const response = await requestJsonCompletion<CompatibilityResponse>(request);
      return {
        leftCompatibleWithRight: response.leftCompatibleWithRight,
        rightCompatibleWithLeft: response.rightCompatibleWithLeft,
      };
    } catch (error) {
      console.error('Error analyzing compatibility:', error);
      return {
        leftCompatibleWithRight: false,
        rightCompatibleWithLeft: false,
      };
    }
  }

  async generateModifiedStatement(
    originalContent: string,
    originalPolarity: 'left' | 'right',
    opposingContent: string,
    config: BridgeCreatorConfig
  ): Promise<string | null> {
    const polarityName = originalPolarity === 'left' ? 'center-left' : 'center-right';
    const otherSide = originalPolarity === 'left' ? 'center-right' : 'center-left';

    const prompt = `You are helping create a "bridge" version of a political statement.

ORIGINAL STATEMENT (${polarityName}):
${originalContent}

OPPOSING STATEMENT (${otherSide}):
${opposingContent}

The goal is to create a modified version of the original statement that:
1. Keeps the core position/intent of the original
2. Makes explicit any ways it could be compatible with the opposing view
3. Uses language that makes compatibility clear ("I'd prefer X, but I could live with Y")
4. Does NOT betray the original position or pretend to agree with things you don't

Generate a modified statement that the original author would likely be willing to sign, while making compatibility with the other side more explicit. Keep it concise (2-3 sentences).`;

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: 'You are a helpful assistant that helps create political bridge statements.',
      userPrompt: prompt,
    };

    interface ModifiedResponse {
      modified_statement: string;
      explanation: string;
    }

    try {
      const response = await requestJsonCompletion<ModifiedResponse>(request);
      return response.modified_statement;
    } catch (error) {
      console.error('Error generating modified statement:', error);
      return null;
    }
  }

  async generateCommonalityStatement(
    leftContent: string,
    rightContent: string,
    config: BridgeCreatorConfig
  ): Promise<string | null> {
    const prompt = `Generate a "common ground" statement that represents a position both sides could accept.

LEFT-LEANING POSITION:
${leftContent}

RIGHT-LEANING POSITION:
${rightContent}

Find a position in the middle that both sides could honestly say they would "rather live with than keep fighting forever."
This should be a genuine compromise that addresses the core concerns of both sides.
Keep it concise (2-3 sentences).`;

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: 'You are a helpful assistant that helps find common ground between political positions.',
      userPrompt: prompt,
    };

    interface CommonalityResponse {
      commonality_statement: string;
      explanation: string;
    }

    try {
      const response = await requestJsonCompletion<CommonalityResponse>(request);
      return response.commonality_statement;
    } catch (error) {
      console.error('Error generating commonality statement:', error);
      return null;
    }
  }
}

export function createNudgerStrategy(): BridgeCreatorNudger {
  return new BridgeCreatorNudger();
}
