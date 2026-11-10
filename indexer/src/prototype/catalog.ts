import type { Abi, AbiEvent, Hex } from "viem";
import { conceptspaceContracts } from "../indexing/conceptspaceContracts";
import { loadIndexerDeploymentContext, type ContractDeployment } from "../indexing/ponderEnv";
import { readIndexerContractCapability } from "../indexing/contractCapabilities";
import { registerRawEvents } from "../indexing/rawEventRegistrations";
import { address, type Catalog, type Source } from "./types";

type Definition = {
  abi: Abi; startBlock: number;
  address?: Hex | readonly Hex[] | {
    address?: Hex | readonly Hex[]; event: AbiEvent; parameter: string; startBlock?: number;
  };
};

/** Reuses config builders, but never imports ponder.config or installs its global RPC guards. */
export async function loadCatalog(only?: string[]): Promise<Catalog> {
  const context = loadIndexerDeploymentContext();
  const deployments = new Map<string, ContractDeployment[]>();
  const getDeployments = context.getDeployments;
  context.getDeployments = (...args) => {
    const result = getDeployments(...args);
    deployments.set(args[0], result);
    return result;
  };
  const definitions: Record<string, Definition> = { ...conceptspaceContracts(context) };
  if (readIndexerContractCapability(process.env.INDEXER_CONTRACTS) === "all") {
    const { fundingContracts } = await import("../indexing/fundingContracts");
    Object.assign(definitions, fundingContracts(context));
  }
  if (only?.some(name => !definitions[name])) throw new Error("Unknown or disabled contract selection");
  const selected = new Set(only ?? Object.keys(definitions));
  const names = new Map<string, Set<string>>();
  registerRawEvents(registration => {
    const [contract, event] = registration.split(":") as [string, string];
    if (!names.has(contract)) names.set(contract, new Set());
    names.get(contract)!.add(event);
  });
  const events = (name: string): AbiEvent[] => {
    const result = definitions[name]!.abi.filter((item): item is AbiEvent =>
      item.type === "event" && names.get(name)?.has(item.name) === true);
    if (result.length !== names.get(name)?.size) throw new Error(`Event ABI mismatch: ${name}`);
    return result;
  };
  const sources: Source[] = [];
  const factories: Catalog["factories"] = [];
  for (const [name, definition] of Object.entries(definitions)) {
    if (!selected.has(name)) continue;
    const configured = definition.address;
    if (configured && typeof configured === "object" && "event" in configured) {
      const addresses = typeof configured.address === "string" ? [configured.address] : configured.address ?? [];
      for (const factoryAddress of addresses) {
        const parent = [...deployments.entries()].find(([, list]) =>
          list.some(item => item.address.toLowerCase() === factoryAddress.toLowerCase()));
        if (!parent) throw new Error(`Missing factory deployment for ${name}`);
        const deployment = parent[1].find(item => item.address.toLowerCase() === factoryAddress.toLowerCase())!;
        factories.push({
          source: { name: parent[0], address: address(factoryAddress), startBlock: BigInt(deployment.startBlock), events: [] },
          event: configured.event, parameter: configured.parameter, childName: name, childEvents: events(name),
        });
      }
    } else {
      for (const deployment of deployments.get(name) ?? []) {
        sources.push({ name, address: address(deployment.address), startBlock: BigInt(deployment.startBlock), events: events(name) });
      }
    }
  }
  if (!sources.length && !factories.length) throw new Error("No configured sources selected");
  return { sources, factories };
}
