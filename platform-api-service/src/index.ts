import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { PlatformApiService } from './service.js';
import { FileContentSubmissionStore } from './submissions.js';
import { TwitterClient } from './twitterClient.js';
import { YouTubeClient } from './youtubeClient.js';
import { PolicyBundleRuntime } from '@commonality/sdk/policy-lists';

const config = loadConfig();
const service = new PlatformApiService({
  config,
  twitterClient: new TwitterClient(config),
  youtubeClient: new YouTubeClient(config),
  contentSubmissionStore: new FileContentSubmissionStore(config.contentSubmissionsFilePath),
});
const policyRuntime = config.policyBundleUrl ? new PolicyBundleRuntime() : undefined;
if (policyRuntime && config.policyBundleUrl) {
  const snapshot = await policyRuntime.refresh(
    config.policyBundleUrl,
    (url) => fetch(url) as ReturnType<typeof fetch>,
  );
  if (snapshot.status === 'unavailable') {
    throw new Error(
      `Failed to activate operator policy bundle: ${snapshot.error?.message ?? 'unknown error'}`,
    );
  }
}
const app = createApp(service, config, policyRuntime);

app.listen(config.port, () => {
  console.log(`Platform API service listening on port ${config.port}`);
});
