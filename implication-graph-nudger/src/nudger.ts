import {
  type SDKMachinery,
  type IpfsCidV1,
  getStatement,
  getImplicationsFrom,
  getImplicationsTo,
} from '@commonality/sdk';
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
