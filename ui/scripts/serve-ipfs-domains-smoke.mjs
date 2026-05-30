import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const port = Number(process.env.PORT ?? 5190)
const distRoot = resolve('dist')
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
])

function safeResolve(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] ?? '/')
  const normalizedPath = normalize(decodedPath).replace(/^\.\.(?:[/\\]|$)/, '')
  const candidate = resolve(distRoot, `.${normalizedPath}`)
  if (!candidate.startsWith(distRoot)) return null
  return candidate
}

function fileForRequest(urlPath) {
  const candidate = safeResolve(urlPath)
  if (!candidate) return null
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const indexFile = join(candidate, 'index.html')
    if (existsSync(indexFile)) return indexFile
  }

  const segments = (urlPath.split('?')[0] ?? '/').split('/').filter(Boolean)
  if (segments.length > 0) {
    const domain = segments[0]
    const assetIndex = segments.indexOf('assets')
    if (assetIndex >= 0 && assetIndex < segments.length - 1) {
      const domainAsset = resolve(distRoot, domain, 'assets', ...segments.slice(assetIndex + 1))
      if (domainAsset.startsWith(distRoot) && existsSync(domainAsset) && statSync(domainAsset).isFile()) return domainAsset
    }

    const lastSegment = segments.at(-1)
    if (lastSegment === 'config.json') {
      const domainConfig = resolve(distRoot, domain, 'config.json')
      if (domainConfig.startsWith(distRoot) && existsSync(domainConfig) && statSync(domainConfig).isFile()) return domainConfig
    }

    const domainFile = segments.length === 2 ? resolve(distRoot, domain, segments[1]) : null
    if (domainFile?.startsWith(distRoot) && existsSync(domainFile) && statSync(domainFile).isFile()) return domainFile

    const domainIndex = resolve(distRoot, domain, 'index.html')
    if (domainIndex.startsWith(distRoot) && existsSync(domainIndex)) return domainIndex
  }

  return null
}

const server = createServer((req, res) => {
  const filePath = fileForRequest(req.url ?? '/')
  if (!filePath) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  res.writeHead(200, { 'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
})

server.listen(port, () => {
  console.log(`IPFS domain smoke server listening on http://localhost:${port}`)
})
