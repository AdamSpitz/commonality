import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMiningApp } from './app.js'
import { loadRepoEnv } from './env.js'

loadRepoEnv()

const here = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(here, '../public')
const port = Number(process.env.DATA_MINING_PORT || 5180)
const app = createMiningApp()
app.use(express.static(publicDir))
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Data mining workbench: http://localhost:${port}/`)
})
