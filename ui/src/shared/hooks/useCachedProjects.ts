import { useCallback, useEffect, useState } from 'react';
import {
  getAllProjectAddresses,
  type ProjectSortField,
  type ProjectWithMetrics,
} from '@commonality/sdk';
import type { FoldCacheOptions } from '../foldCache';
import { useMachinery } from './useMachinery';
import { loadProjectWithCache } from './useCachedProject';

function withMetrics(projects: Awaited<ReturnType<typeof loadProjectWithCache>>[]): ProjectWithMetrics[] {
  return projects
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .map((project) => {
      const threshold = BigInt(project.threshold);
      const totalReceived = BigInt(project.totalReceived);
      const fundingProgress = threshold > 0n
        ? Number((totalReceived * 10000n) / threshold) / 10000
        : 0;

      return {
        ...project,
        fundingProgress,
        createdAtBlock: project.blockNumber ?? '',
      };
    });
}

function sortProjects(
  projects: ProjectWithMetrics[],
  sortBy: ProjectSortField,
  sortDirection: 'asc' | 'desc'
): ProjectWithMetrics[] {
  return [...projects].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'createdAt':
        comparison = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
          || Number(BigInt(a.createdAtBlock || '0') - BigInt(b.createdAtBlock || '0'));
        break;
      case 'deadline':
        comparison = Number(BigInt(a.deadline) - BigInt(b.deadline));
        break;
      case 'threshold':
        comparison = Number(BigInt(a.threshold) - BigInt(b.threshold));
        break;
      case 'totalReceived':
        comparison = Number(BigInt(a.totalReceived) - BigInt(b.totalReceived));
        break;
      case 'fundingProgress':
        comparison = a.fundingProgress - b.fundingProgress;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

interface UseCachedProjectsOptions {
  cacheOptions: Omit<FoldCacheOptions, 'address'>;
  sortBy: ProjectSortField;
  sortDirection: 'asc' | 'desc';
}

interface UseCachedProjectsResult {
  projects: ProjectWithMetrics[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCachedProjects({
  cacheOptions,
  sortBy,
  sortDirection,
}: UseCachedProjectsOptions): UseCachedProjectsResult {
  const machinery = useMachinery();
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const addresses = await getAllProjectAddresses(machinery);
      const loadedProjects = await Promise.all(
        addresses.map((address) => loadProjectWithCache(machinery, address, cacheOptions))
      );
      const sortedProjects = sortProjects(withMetrics(loadedProjects), sortBy, sortDirection);
      setProjects(sortedProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [cacheOptions, machinery, sortBy, sortDirection]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    reload: loadProjects,
  };
}
