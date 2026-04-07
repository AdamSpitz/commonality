import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { PlatformApiService } from './service.js';
import { TwitterClient } from './twitterClient.js';
import { YouTubeClient } from './youtubeClient.js';

const config = loadConfig();
const service = new PlatformApiService({
  config,
  twitterClient: new TwitterClient(config),
  youtubeClient: new YouTubeClient(config),
});
const app = createApp(service, config);

app.listen(config.port, () => {
  console.log(`Platform API service listening on port ${config.port}`);
});
