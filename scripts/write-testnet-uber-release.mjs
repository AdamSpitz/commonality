import { readFile, writeFile } from 'node:fs/promises'

const [releaseFile, environmentPath, rootCid, publicBaseUrl, appsJsonFile, rootIpnsName] = process.argv.slice(2)

if (!releaseFile || !environmentPath || !rootCid || publicBaseUrl === undefined || !appsJsonFile) {
  console.error('Usage: node scripts/write-testnet-uber-release.mjs <release-file> <environment-path> <root-cid> <public-base-url> <apps-json-file> [root-ipns-name]')
  process.exit(1)
}

const apps = JSON.parse(await readFile(appsJsonFile, 'utf8'))
const generatedAt = new Date().toISOString()
const rootPath = `/${environmentPath}`
const rootUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}${rootPath}` : undefined

await writeFile(
  releaseFile,
  `${JSON.stringify({
    environment: 'testnet',
    environmentPath,
    generatedAt,
    rootCid,
    rootPath,
    ...(rootUrl ? { rootUrl } : {}),
    ...(rootIpnsName ? { rootIpnsName } : {}),
    apps,
  }, null, 2)}\n`,
)
