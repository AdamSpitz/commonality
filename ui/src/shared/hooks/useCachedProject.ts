import { useCallback, useEffect, useState } from 'react';
import {
  PROJECT_FOLD_VERSION,
  type Project,
  type ProjectAccumulator,
  type SDKMachinery,
} from '@commonality/sdk';
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
  reload: () => Promise<void>;
}

interface UseCachedProjectOptions {
  projectAddress: string;
  cacheOptions: Omit<FoldCacheOptions, 'address'>;
}

function projectToAccumulator(project: Project): ProjectAccumulator {
  return {
    foldVersion: PROJECT_FOLD_VERSION,
    id: project.id,
    erc1155Address: project.erc1155Address,
    recipient: project.recipient,
    conditionAddress: project.conditionAddress,
    metadataCid: project.metadataCid,
    createdAt: project.createdAt,
    blockNumber: project.blockNumber,
    totalReceived: BigInt(project.totalReceived),
  };
}

export async function loadProjectWithCache(
  machinery: SDKMachinery,
  projectAddress: string,
  cacheOptions: Omit<FoldCacheOptions, 'address'>
): Promise<Project | null> {
  const { getProject } = await import('@commonality/sdk');

  if (!projectAddress) {
    return null;
  }

  if (
    !machinery.eventCacheUrl ||
    !machinery.contractAddresses ||
    !cacheOptions.contractAddresses?.assuranceContractFactory
  ) {
    return getProject(machinery, projectAddress);
  }

  const cacheKeyOptions: FoldCacheOptions = {
    ...cacheOptions,
    address: projectAddress,
  };
  const cached = await loadCachedProjectAccumulator(cacheKeyOptions);

  if (cached) {
    const project = await getProject(machinery, projectAddress, {
      initialAccumulator: cached.accumulator,
      blockNumber_gte: cached.blockNumber,
    });

    if (project) {
      const latestBlockNumber = project.blockNumber ?? cached.blockNumber;
      if (latestBlockNumber !== cached.blockNumber) {
        await saveCachedProjectAccumulator(
          cacheKeyOptions,
          projectToAccumulator(project),
          latestBlockNumber
        );
      }
    }

    return project;
  }

  const project = await getProject(machinery, projectAddress);
  if (project) {
    await saveCachedProjectAccumulator(
      cacheKeyOptions,
      projectToAccumulator(project),
      project.blockNumber ?? '0'
    );
  }
  return project;
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
    if (!projectAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedProject = await loadProjectWithCache(machinery, projectAddress, cacheOptions);
      setProject(loadedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [machinery, projectAddress, cacheOptions]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return { project, loading, error, reload: loadProject };
}
