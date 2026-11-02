// No Vite file watchers — this machine is already at inotify EMFILE.
// From repo root: node spikes/base-account-paymaster/serve.mjs
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const dir = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 4177)

const bundled = await build({
  absWorkingDir: join(dir, '../..'),
  entryPoints: [join(dir, 'main.js')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
  logLevel: 'info',
})
const js = bundled.outputFiles[0].text
const html = await readFile(join(dir, 'index.html'), 'utf8')

const server = createServer((req, res) => {
  const url = req.url?.split('?')[0] || '/'

  if (url === '/paymaster') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      console.log('\nPAYMASTER', req.method, url)
      console.log(body || '(empty body)')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Headers', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'spike echo only; not a real paymaster' },
      }))
    })
    return
  }

  if (url === '/main.js' || url === '/dist/main.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    res.end(js)
    return
  }

  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Base Account spike: http://127.0.0.1:${port}`)
})
