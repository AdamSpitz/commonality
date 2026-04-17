import { useCallback, useEffect, useState } from 'react';
import { type Project, type ProjectAccumulator } from '@commonality/sdk';
import {
  loadCachedProjectAccumulator,
  saveCachedProjectAccumulator,
  type FoldCacheOptions,
} from '../foldCache';
import { useMachinery } from './useMachinery';

interface UseCachedProjectResult {
  project: Project | null;
  loading: boolean;
  error: string | null;
}

interface UseCachedProjectOptions {
  projectAddress: string;
  cacheOptions: Omit<FoldCacheOptions, 'address'>;
}

export function useCachedProject({
  projectAddress,
  cacheOptions,
}: UseCachedProjectOptions): UseCachedProjectResult {
  const machinery = useMachinery();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectAddress || !machinery.eventCacheUrl || !machinery.contractAddresses) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKeyOptions: FoldCacheOptions = {
        ...cacheOptions,
        address: projectAddress,
      };

      const cached = await loadCachedProjectAccumulator(cacheKeyOptions);

      const { getProject } = await import('@commonality/sdk');

      if (cached) {
        const proj = await getProject(machinery, projectAddress, {
          initialAccumulator: cached.accumulator,
          blockNumber_gte: cached.blockNumber,
        });

        if (proj) {
          const latestBlockNumber = proj.blockNumber ?? cached.blockNumber;
          if (latestBlockNumber !== cached.blockNumber) {
            const newAccumulator: ProjectAccumulator = {
              foldVersion: cached.accumulator.foldVersion,
              id: proj.id,
              erc1155Address: proj.erc1155Address,
              recipient: proj.recipient,
              conditionAddress: proj.conditionAddress,
              metadataCid: proj.metadataCid,
              createdAt: proj.createdAt,
              blockNumber: proj.blockNumber,
              totalReceived: BigInt(proj.totalReceived),
            };
            await saveCachedProjectAccumulator(cacheKeyOptions, newAccumulator, latestBlockNumber);
          }
          setProject(proj);
        } else {
          setProject(null);
        }
      } else {
        const proj = await getProject(machinery, projectAddress);
        if (proj) {
          const newAccumulator: ProjectAccumulator = {
            foldVersion: 1,
            id: proj.id,
            erc1155Address: proj.erc1155Address,
            recipient: proj.recipient,
            conditionAddress: proj.conditionAddress,
            metadataCid: proj.metadataCid,
            createdAt: proj.createdAt,
            blockNumber: proj.blockNumber,
            totalReceived: BigInt(proj.totalReceived),
          };
          await saveCachedProjectAccumulator(
            cacheKeyOptions,
            newAccumulator,
            proj.blockNumber ?? '0'
          );
        }
        setProject(proj);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [machinery, projectAddress, cacheOptions]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return { project, loading, error };
}