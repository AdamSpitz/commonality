import { getStatement, getImplicationsFrom, getImplicationsTo } from '@commonality/sdk/conceptspace';
import { getContractAddressesForChain, type SDKMachinery } from '@commonality/sdk/machinery';
import { fetchEvents } from '@commonality/sdk/utils';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { publishedDataIdToCid, type PublishedDataId } from '@commonality/sdk/published-data';
import type { NudgerConfig, NudgeMessage } from '@commonality/nudger-core';

export class ImplicationGraphNudger {
  name = 'implication-graph';

  async generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    _config: NudgerConfig
  ): Promise<NudgeMessage[]> {
    const nudges: NudgeMessage[] = [];

    const sourceStatement = await getStatement(machinery, targetStatementCid);
    if (!sourceStatement) {
      return [];
    }

    const implicationsFrom = await getImplicationsFrom(machinery, targetStatementCid);
    for (const implication of implicationsFrom) {
      const targetStatement = await getStatement(machinery, implication.toStatementCid);
      if (!targetStatement) {
        continue;
      }

      if (targetStatement.believerCount > sourceStatement.believerCount) {
        nudges.push({
          targetStatementCid,
          suggestedStatementCid: implication.toStatementCid,
          reason: `This statement is implied by the current statement and has ${targetStatement.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
          confidence: this.calculateConfidence(
            sourceStatement.believerCount,
            targetStatement.believerCount
          ),
        });
      }
    }

    const implicationsTo = await getImplicationsTo(machinery, targetStatementCid);
    for (const implication of implicationsTo) {
      const sourceOfImplication = await getStatement(machinery, implication.fromStatementCid);
      if (!sourceOfImplication) {
        continue;
      }

      if (sourceOfImplication.believerCount > sourceStatement.believerCount) {
        nudges.push({
          targetStatementCid,
          suggestedStatementCid: implication.fromStatementCid,
          reason: `This statement implies the current statement and has ${sourceOfImplication.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
          confidence: this.calculateConfidence(
            sourceStatement.believerCount,
            sourceOfImplication.believerCount
          ),
        });
      }
    }

    nudges.sort((a, b) => b.confidence - a.confidence);
    return nudges;
  }

  async generateRetractionReanchorNudges(
    machinery: SDKMachinery,
    _config: NudgerConfig,
  ): Promise<NudgeMessage[]> {
    const publishedDataAddress = getContractAddressesForChain(machinery)?.publishedData;
    if (!publishedDataAddress) return [];

    const retractionEvents = await fetchEvents(machinery, {
      contractAddress: publishedDataAddress,
      eventName: 'DataRetracted',
      limit: 10000,
    });

    const nudgesByPair = new Map<string, NudgeMessage>();
    for (const event of retractionEvents) {
      if (!event.topic2) continue;

      let retractedStatementCid: IpfsCidV1;
      try {
        retractedStatementCid = publishedDataIdToCid(event.topic2.toLowerCase() as PublishedDataId);
      } catch {
        continue;
      }

      const implicationsFromRetractedStatement = await getImplicationsFrom(machinery, retractedStatementCid);
      for (const implication of implicationsFromRetractedStatement) {
        const suggestedStatement = await getStatement(machinery, implication.toStatementCid);
        if (!suggestedStatement) continue;

        const nudge: NudgeMessage = {
          targetStatementCid: retractedStatementCid,
          suggestedStatementCid: implication.toStatementCid,
          reason: 'You signed this statement, but its publisher has retracted it. It implied this suggested statement; sign the suggested statement directly if it still matches your view.',
          confidence: 0.8,
        };
        nudgesByPair.set(`${nudge.targetStatementCid}:${nudge.suggestedStatementCid}`, nudge);
      }
    }

    return [...nudgesByPair.values()];
  }

  private calculateConfidence(sourceCount: number, targetCount: number): number {
    if (targetCount <= sourceCount) {
      return 0;
    }

    const ratio = targetCount / sourceCount;
    if (ratio >= 10) {
      return 0.9;
    } else if (ratio >= 5) {
      return 0.8;
    } else if (ratio >= 2) {
      return 0.7;
    } else {
      return 0.5;
    }
  }
}

export function createNudgerStrategy(): ImplicationGraphNudger {
  return new ImplicationGraphNudger();
}
