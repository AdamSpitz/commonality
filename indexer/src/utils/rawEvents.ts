/**
 * Raw event capture utility for the events cache.
 * Shared by all subsystem handlers to insert raw events into the events table.
 */

/**
 * Extract raw event data for insertion into the events table.
 * Called from within ponder.on() handlers alongside business logic.
 *
 * @param event - The event object from ponder.on() handler
 * @param eventName - The event name (e.g. "DirectSupport"), since event.name is not available in Ponder handlers
 */
export function captureRawEvent(event: any, eventName: string) {
  const log = event.log;
  const block = event.block;
  // Use event.transaction.hash as log.transactionHash may not be available in all Ponder versions
  const txHash = event.transaction?.hash ?? log.transactionHash;

  const eventId = `${txHash}-${log.logIndex}`;

  return {
    id: eventId,
    contractAddress: log.address.toLowerCase() as `0x${string}`,
    eventName,
    blockNumber: BigInt(block.number),
    blockTimestamp: BigInt(block.timestamp),
    transactionHash: txHash,
    logIndex: log.logIndex,
    topic0: log.topics[0] || null,
    topic1: log.topics[1] || null,
    topic2: log.topics[2] || null,
    topic3: log.topics[3] || null,
    data: log.data,
  };
}
