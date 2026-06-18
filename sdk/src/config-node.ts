import { IPFSConfig } from "./utils/ipfs.js";
import { TwitterApiConfig } from "./utils/twitter.js";

export function createIPFSConfigInNodeJSFromTheUsualEnvVars(): IPFSConfig {
  return {
    gatewayUrl: process.env.IPFS_GATEWAY,
    apiUrl: process.env.IPFS_API,
    debugIpfs: process.env.DEBUG_IPFS === 'true',
    shouldUseMock: process.env.SHOULD_USE_MOCK_IPFS === 'true',
  };
}

export function createTwitterApiConfigInNodeJSFromTheUsualEnvVars(): TwitterApiConfig {
  return {
    platformApiBaseUrl: process.env.PLATFORM_API_URL || 'http://localhost:3001',
  };
}
