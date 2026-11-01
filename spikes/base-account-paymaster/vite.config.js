import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  plugins: [
    {
      name: 'paymaster-echo',
      configureServer(server) {
        server.middlewares.use('/paymaster', (req, res) => {
          const chunks = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8')
            console.log('\nPAYMASTER', req.method, req.url)
            console.log(body || '(empty body)')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Headers', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              error: { code: -32000, message: 'spike echo only; not a real paymaster' },
            }))
          })
        })
      },
    },
  ],
})
