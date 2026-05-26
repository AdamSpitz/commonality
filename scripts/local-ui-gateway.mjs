import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const domains = [
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'noninflammatory',
  'csm',
  'conceptspace',
]

const port = Number(process.env.PORT || 8088)
const artifactRoot = process.env.UI_IPFS_ARTIFACT_ROOT || path.resolve('data', 'ui-ipfs')
const ipfsGatewayBaseUrl = (process.env.UI_IPFS_GATEWAY_INTERNAL || 'http://localhost:8080/ipfs').replace(/\/$/, '')

function resolveDomainFromHost(hostHeader = '') {
  const host = hostHeader.toLowerCase().split(':')[0]
  const matchedDomain = domains.find(domain => host === `${domain}.localhost`)
  return matchedDomain || null
}

async function readCid(domain) {
  return (await fs.readFile(path.join(artifactRoot, domain, 'cid.txt'), 'utf8')).trim()
}

function renderAdminPage() {
  const links = domains
    .map(domain => `<li><a href="http://${domain}.localhost:${port}/#/">${domain}</a></li>`)
    .join('\n')
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Commonality local UI admin</title></head>
  <body>
    <h1>Commonality local UI admin</h1>
    <p>Bookmark this page to jump to any of the stable local IPFS UI bundles.</p>
    <ul>${links}</ul>
  </body>
</html>
`
}

async function proxyToIpfs(req, res, domain) {
  const cid = await readCid(domain)
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${domain}.localhost:${port}`}`)
  const targetPath = requestUrl.pathname === '/' ? '/' : requestUrl.pathname
  const targetUrl = `${ipfsGatewayBaseUrl}/${cid}/${domain}-ui${targetPath}${requestUrl.search}`

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
  if (targetPath === '/' || targetPath.endsWith('/index.html')) {
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

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('ok\n')
      return
    }

    const domain = resolveDomainFromHost(req.headers.host)
    if (!domain) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(renderAdminPage())
      return
    }

    await proxyToIpfs(req, res, domain)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Local UI gateway error: ${message}\n`)
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Commonality local UI gateway listening on http://localhost:${port}`)
  for (const domain of domains) {
    console.log(`  http://${domain}.localhost:${port}/#/`)
  }
})
