import { getAddress, type Address } from 'viem';

export interface TrustWriter {
  getTrust(address: Address): Promise<number>;
  setTrustBatch(addresses: Address[], scores: number[]): Promise<void>;
}

export async function reconcileDenylist(writer: TrustWriter, denied: ReadonlySet<Address>): Promise<Address[]> {
  const revocations: Address[] = [];
  for (const address of denied) {
    if (await writer.getTrust(address) > 0) revocations.push(address);
  }
  if (revocations.length > 0) await writer.setTrustBatch(revocations, revocations.map(() => 0));
  return revocations;
}

export async function admitAttesters(
  writer: TrustWriter,
  candidates: readonly Address[],
  denied: ReadonlySet<Address>,
  serviceAddress: Address,
  batchSize: number,
): Promise<Address[]> {
  const deniedLower = new Set(Array.from(denied, address => address.toLowerCase()));
  const unique = Array.from(new Set(candidates.map(address => getAddress(address))))
    .filter(address => address.toLowerCase() !== serviceAddress.toLowerCase())
    .filter(address => !deniedLower.has(address.toLowerCase()));
  const admissions: Address[] = [];
  for (const address of unique) {
    if (await writer.getTrust(address) === 0) admissions.push(address);
  }
  for (let offset = 0; offset < admissions.length; offset += batchSize) {
    const batch = admissions.slice(offset, offset + batchSize);
    await writer.setTrustBatch(batch, batch.map(() => 100));
  }
  return admissions;
}
