export interface ContentFinderConfig {
  platformApiUrl: string;
  attesterUrl: string;
  attesterFinderKey: string;
  pollIntervalMs: number;
  submissionsApiUrl?: string;
  submissionsFilePath: string;
  stateFilePath: string;
}

export function loadConfig(): ContentFinderConfig {
  const required = (name: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  return {
    platformApiUrl: required('PLATFORM_API_URL', process.env.PLATFORM_API_URL),
    attesterUrl: required('ATTESTER_URL', process.env.ATTESTER_URL),
    attesterFinderKey: required('ATTESTER_FINDER_KEY', process.env.ATTESTER_FINDER_KEY),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
    submissionsApiUrl: process.env.SUBMISSIONS_API_URL,
    submissionsFilePath: process.env.SUBMISSIONS_FILE_PATH || './content-finder-submissions.json',
    stateFilePath: process.env.STATE_FILE_PATH || './content-finder-state.json',
  };
}
