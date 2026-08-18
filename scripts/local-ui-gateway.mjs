import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getDomainForLocalHost, getLocalStableUrl, uiDomains } from './ui-domains.mjs'

const port = Number(process.env.PORT || 8088)
const artifactRoot = process.env.UI_IPFS_ARTIFACT_ROOT || path.resolve('data', 'ui-ipfs')
const ipfsGatewayBaseUrl = (process.env.UI_IPFS_GATEWAY_INTERNAL || 'http://localhost:8080/ipfs').replace(/\/$/, '')
const indexerBaseUrl = (process.env.UI_INDEXER_INTERNAL || 'http://localhost:42069').replace(/\/$/, '')

// The IPFS bundles ship a config.json without VITE_EVENT_CACHE_URL, so the SDK
// falls back to the page origin and issues same-origin requests. Forward those
// to the local indexer instead of the IPFS bundle, which would 404 on all of
// them and make every data-backed page render an empty or error state.
const indexerPathPrefixes = ['/api/', '/sql/', '/graphql', '/status']

function isIndexerPath(pathname) {
  return indexerPathPrefixes.some(prefix =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function resolveDomainFromHost(hostHeader = '') {
  return getDomainForLocalHost(hostHeader)
}

async function readCid(domain) {
  return (await fs.readFile(path.join(artifactRoot, domain, 'cid.txt'), 'utf8')).trim()
}

async function publishedDomains() {
  const found = []
  for (const domain of uiDomains) {
    try {
      await readCid(domain)
      found.push(domain)
    } catch {
      // Skip domains that were not published this start (see LOCAL_UI_DOMAINS).
    }
  }
  return found
}

async function renderAdminPage() {
  const domains = await publishedDomains()
  const links = domains
    .map(domain => `<li><a href="${getLocalStableUrl(domain, port)}">${domain}</a></li>`)
    .join('\n')
  const note = domains.length < uiDomains.length
    ? `<p>Only published bundles are listed. Restore the rest with <code>LOCAL_UI_DOMAINS=all</code> (see workflow/local-development.md).</p>`
    : ''
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Commonality local UI admin</title></head>
  <body>
    <h1>Commonality local UI admin</h1>
    <p>Bookmark this page to jump to any of the stable local IPFS UI bundles.</p>
    ${note}
    <ul>${links}</ul>
  </body>
</html>
`
}

async function forward(req, res, targetUrl, { noStore = false } = {}) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'host' || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
    duplex: req.method === 'GET' || req.method === 'HEAD' ? undefined : 'half',
  })

  res.statusCode = upstreamResponse.status
  for (const [key, value] of upstreamResponse.headers) {
    res.setHeader(key, value)
  }
  if (noStore) {
    res.setHeader('cache-control', 'no-store')
  }
  if (!upstreamResponse.body) {
    res.end()
    return
  }
  for await (const chunk of upstreamResponse.body) {
    res.write(chunk)
  }
  res.end()
}

function requestUrlFor(req, domain) {
  return new URL(req.url || '/', `http://${req.headers.host || `${domain}.localhost:${port}`}`)
}

async function proxyToIpfs(req, res, domain) {
  const cid = await readCid(domain)
  const requestUrl = requestUrlFor(req, domain)
  const targetPath = requestUrl.pathname === '/' ? '/' : requestUrl.pathname
  const targetUrl = `${ipfsGatewayBaseUrl}/${cid}/${domain}-ui${targetPath}${requestUrl.search}`
  await forward(req, res, targetUrl, {
    noStore: targetPath === '/' || targetPath.endsWith('/index.html'),
  })
}

async function proxyToIndexer(req, res, domain) {
  const requestUrl = requestUrlFor(req, domain)
  await forward(req, res, `${indexerBaseUrl}${requestUrl.pathname}${requestUrl.search}`, { noStore: true })
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('ok\n')
      return
    }

    const domain = resolveDomainFromHost(req.headers.host)
    if (domain && isIndexerPath(requestUrlFor(req, domain).pathname)) {
      await proxyToIndexer(req, res, domain)
      return
    }

    if (!domain) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(await renderAdminPage())
      return
    }

    await proxyToIpfs(req, res, domain)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Local UI gateway error: ${message}\n`)
  }
})

server.listen(port, '0.0.0.0', async () => {
  console.log(`Commonality local UI gateway listening on http://localhost:${port}`)
  for (const domain of await publishedDomains()) {
    console.log(`  ${getLocalStableUrl(domain, port)}`)
  }
})
