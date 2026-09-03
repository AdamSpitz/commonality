export function sortedByBlockOrder<T extends { blockNumber: bigint; logIndex: number }>(events: T[]): T[] {
  return events.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.logIndex - b.logIndex;
  });
}
