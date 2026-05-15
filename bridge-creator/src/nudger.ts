import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type SDKMachinery,
  type IpfsCidV1,
  getStatement,
  getAllStatements,
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

export interface BridgeCreatorDependencies {
  getStatement: typeof getStatement;
  getAllStatements: typeof getAllStatements;
  getStatementWithContent: typeof getStatementWithContent;
  uploadToIPFS: typeof uploadToIPFS;
  requestJsonCompletion: typeof requestJsonCompletion;
}

const defaultDependencies: BridgeCreatorDependencies = {
  getStatement,
  getAllStatements,
  getStatementWithContent,
  uploadToIPFS,
  requestJsonCompletion,
};

interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

const promptTemplateCache = new Map<string, PromptTemplate>();

function loadPromptTemplate(fileName: string): PromptTemplate {
  const cached = promptTemplateCache.get(fileName);
  if (cached) {
    return cached;
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const promptPath = join(moduleDir, '..', 'prompts', fileName);
  const promptFile = readFileSync(promptPath, 'utf8');
  const systemPrompt = extractPromptSection(promptFile, 'System prompt');
  const userPrompt = extractPromptSection(promptFile, 'User prompt');
  const template = { systemPrompt, userPrompt };
  promptTemplateCache.set(fileName, template);
  return template;
}

function extractPromptSection(promptFile: string, heading: string): string {
  const match = promptFile.match(new RegExp(`(?:^|\\n)## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
  if (!match) {
    throw new Error(`Prompt file is missing a "## ${heading}" section`);
  }
  return match[1]!.trim();
}

function renderPrompt(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.split(`{{${key}}}`).join(value),
    template
  );
}

export class BridgeCreatorNudger implements NudgerStrategy<BridgeCreatorConfig> {
  name = 'bridge-creator';

  constructor(
    private readonly dependencies: BridgeCreatorDependencies = defaultDependencies,
  ) {}

  async generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: BridgeCreatorConfig
  ): Promise<NudgeMessage[]> {
    const sourceStatement = await this.dependencies.getStatement(machinery, targetStatementCid);
    if (!sourceStatement) {
      return [];
    }

    const sourceStatementWithContent = await this.dependencies.getStatementWithContent(
      machinery,
      targetStatementCid
    );
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
    return this.dependencies.uploadToIPFS(machinery.ipfsConfig as any, doc);
  }

  private async findBridgeCandidates(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    sourceContent: string,
    config: BridgeCreatorConfig
  ): Promise<BridgeCandidate[]> {
    const statements = await this.fetchCandidateStatements(machinery, targetStatementCid);
    const candidates: BridgeCandidate[] = [];

    for (const stmt of statements) {
      if (!stmt.content) continue;

      const content = this.extractContent(stmt.content);
      if (!content || content === sourceContent) continue;

      const compatibility = await this.analyzeCompatibility(
        sourceContent,
        content,
        config
      );

      if (compatibility.leftCompatibleWithRight || compatibility.rightCompatibleWithLeft) {
        candidates.push({
          leftStatement: { cid: targetStatementCid, content: sourceContent },
          rightStatement: { cid: stmt.cid, content },
          compatibility,
        });
      }
    }

    for (const commonalityText of config.commonalityStatements) {
      if (!commonalityText.trim()) continue;

      const compatibility = await this.analyzeCompatibility(
        sourceContent,
        commonalityText.trim(),
        config
      );

      if (compatibility.leftCompatibleWithRight || compatibility.rightCompatibleWithLeft) {
        candidates.push({
          leftStatement: { cid: targetStatementCid, content: sourceContent },
          rightStatement: { cid: 'preconfigured' as IpfsCidV1, content: commonalityText.trim() },
          compatibility,
        });
      }
    }

    return candidates;
  }

  private async fetchCandidateStatements(
    machinery: SDKMachinery,
    excludeCid: IpfsCidV1,
  ): Promise<Array<{ cid: IpfsCidV1; content: DisplayableDocument | null }>> {
    const statements = await this.dependencies.getAllStatements(machinery, { limit: 20 });
    const results: Array<{ cid: IpfsCidV1; content: DisplayableDocument | null }> = [];

    for (const stmt of statements) {
      if (stmt.cid === excludeCid) continue;
      try {
        const withContent = await this.dependencies.getStatementWithContent(machinery, stmt.cid);
        results.push({ cid: stmt.cid, content: withContent?.content ?? null });
      } catch {
        results.push({ cid: stmt.cid, content: null });
      }
    }

    return results;
  }

  private async createModifiedVersion(
    candidate: BridgeCandidate,
    originalContent: string,
    config: BridgeCreatorConfig
  ): Promise<string | null> {
    return this.generateModifiedStatement(
      originalContent,
      'left',
      candidate.rightStatement.content,
      config
    );
  }

  private async createCommonalityStatement(
    candidate: BridgeCandidate,
    config: BridgeCreatorConfig
  ): Promise<string | null> {
    return this.generateCommonalityStatement(
      candidate.leftStatement.content,
      candidate.rightStatement.content,
      config
    );
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
    const prompt = loadPromptTemplate('compatibility-analysis.md');

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: renderPrompt(prompt.systemPrompt, { leftContent, rightContent }),
      userPrompt: renderPrompt(prompt.userPrompt, { leftContent, rightContent }),
    };

    interface CompatibilityResponse {
      leftCompatibleWithRight: boolean;
      rightCompatibleWithLeft: boolean;
      explanation: string;
    }

    try {
      const response = await this.dependencies.requestJsonCompletion<CompatibilityResponse>(request);
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

    const prompt = loadPromptTemplate('modified-statement-generation.md');
    const variables = {
      originalContent,
      polarityName,
      opposingContent,
      otherSide,
    };

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: renderPrompt(prompt.systemPrompt, variables),
      userPrompt: renderPrompt(prompt.userPrompt, variables),
    };

    interface ModifiedResponse {
      modified_statement: string;
      explanation: string;
    }

    try {
      const response = await this.dependencies.requestJsonCompletion<ModifiedResponse>(request);
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
    const prompt = loadPromptTemplate('commonality-statement-generation.md');
    const variables = { leftContent, rightContent };

    const request: OpenRouterJsonRequest = {
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      systemPrompt: renderPrompt(prompt.systemPrompt, variables),
      userPrompt: renderPrompt(prompt.userPrompt, variables),
    };

    interface CommonalityResponse {
      commonality_statement: string;
      explanation: string;
    }

    try {
      const response = await this.dependencies.requestJsonCompletion<CommonalityResponse>(request);
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
