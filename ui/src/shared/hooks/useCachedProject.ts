import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@commonality/sdk/lazy-giving';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { type FoldCacheOptions } from '../stores/foldCache';
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

/** IndexedDB key material shared by every project-fold cache caller. */
export function projectFoldCacheOptions(
  machinery: SDKMachinery,
): Omit<FoldCacheOptions, 'address'> | null {
  const factory = machinery.contractAddresses?.assuranceContractFactory
  if (!machinery.eventCacheUrl || !factory) return null
  return {
    eventCacheUrl: machinery.eventCacheUrl,
    contractAddresses: { assuranceContractFactory: factory },
    foldType: 'project',
  }
}

/** Load a project. Resume lives in the SDK fold store on the machinery. */
export async function loadProjectWithCache(
  machinery: SDKMachinery,
  projectAddress: string,
  _cacheOptions: Omit<FoldCacheOptions, 'address'>
): Promise<Project | null> {
  const { getProject } = await import('@commonality/sdk/lazy-giving');
  if (!projectAddress) return null;
  return getProject(machinery, projectAddress);
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
