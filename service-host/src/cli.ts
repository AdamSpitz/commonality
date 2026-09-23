import { pathToFileURL } from 'node:url';
import { parseHostCapability } from './config.js';

async function main(): Promise<void> {
  const capability = parseHostCapability(process.env.SERVICE_HOST_CAPABILITY);
  if (capability === 'conceptspace') {
    const { startConceptspaceHost } = await import('./conceptspaceMain.js');
    await startConceptspaceHost();
    return;
  }
  const { startFullHost } = await import('./fullMain.js');
  await startFullHost();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error('[service-host] Startup failed:', error);
    process.exit(1);
  });
}
