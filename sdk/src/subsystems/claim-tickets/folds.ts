import { type Address, getAddress, zeroAddress } from 'viem';

export interface ClaimTicketRecord {
  project: Address;
  transitAddress: Address;
  destination: Address | null;
  redeemed: boolean;
  redeemDeadline: bigint | null;
}

export interface ClaimTicketCreatedEvent {
  project: Address;
  transitAddress: Address;
}

export interface ClaimTicketRedeemedEvent {
  project: Address;
  destination: Address;
  deadline: bigint;
}

export function foldClaimTickets(
  created: readonly ClaimTicketCreatedEvent[],
  redeemed: readonly ClaimTicketRedeemedEvent[] = [],
): Map<Address, ClaimTicketRecord> {
  const byProject = new Map<Address, ClaimTicketRecord>();
  const byTransit = new Map<Address, Address>();
  for (const event of created) {
    const project = getAddress(event.project);
    const transitAddress = getAddress(event.transitAddress);
    const existing = byTransit.get(transitAddress);
    if (existing && existing !== project) {
      throw new Error(`Transit address ${transitAddress} is registered to more than one ticket project.`);
    }
    byTransit.set(transitAddress, project);
    byProject.set(project, {
      project,
      transitAddress,
      destination: null,
      redeemed: false,
      redeemDeadline: null,
    });
  }
  for (const event of redeemed) {
    const project = getAddress(event.project);
    const record = byProject.get(project);
    if (!record) throw new Error(`Redemption for unknown ticket project ${project}.`);
    if (record.redeemed && record.destination !== getAddress(event.destination)) {
      throw new Error(`Ticket project ${project} has conflicting redemptions.`);
    }
    record.redeemed = true;
    record.destination = getAddress(event.destination);
    record.redeemDeadline = event.deadline;
  }
  return byProject;
}

export function ticketProjectByTransit(
  tickets: ReadonlyMap<Address, ClaimTicketRecord>,
  transitAddress: Address,
): ClaimTicketRecord | null {
  const wanted = getAddress(transitAddress);
  if (wanted === zeroAddress) return null;
  for (const record of tickets.values()) {
    if (record.transitAddress === wanted) return record;
  }
  return null;
}
