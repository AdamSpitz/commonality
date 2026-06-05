import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// Provides a `virtual:end-user-docs` module: a Record<relativePath, markdown>.
//
// Per-domain bundling: each branded build only embeds the docs it actually
// serves — the shared/ connective tier plus its own product folder. The
// commonality (big-picture/vision) build gets shared/ + commonality/. Docs for
// other products are reached via cross-domain links, not bundled here.
//
// `includeAll` embeds the entire tree; used by the test build so DocsPage unit
// tests can exercise every domain's docs.

const VIRTUAL_ID = 'virtual:end-user-docs'
const RESOLVED_ID = '\0' + VIRTUAL_ID

interface EndUserDocsPluginOptions {
  domain: string
  includeAll?: boolean
}

function foldersForDomain(domain: string): string[] {
  // `shared/` renders in-context on every site; `commonality/` is the vision
  // site and bundles vision + shared only.
  if (domain === 'commonality') return ['shared', 'commonality']
  return ['shared', domain]
}

function walkMarkdownFiles(dir: string): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walkMarkdownFiles(full))
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

export function endUserDocsPlugin(options: EndUserDocsPluginOptions): Plugin {
  const docsRoot = path.resolve(process.cwd(), '../docs/end-user')

  function addFile(docs: Record<string, string>, file: string): void {
    const rel = path.relative(docsRoot, file).split(path.sep).join('/')
    docs[rel] = readFileSync(file, 'utf8')
  }

  function collectDocs(): Record<string, string> {
    const docs: Record<string, string> = {}
    if (options.includeAll) {
      for (const file of walkMarkdownFiles(docsRoot)) addFile(docs, file)
      return docs
    }
    // Top-level loose .md files (e.g. tldr-for-llms.md) are global — include them
    // in every build alongside this domain's folders.
    for (const entry of readdirSync(docsRoot)) {
      const full = path.join(docsRoot, entry)
      if (entry.endsWith('.md') && statSync(full).isFile()) addFile(docs, full)
    }
    for (const folder of foldersForDomain(options.domain)) {
      const base = path.join(docsRoot, folder)
      let isDir = false
      try {
        isDir = statSync(base).isDirectory()
      } catch {
        continue
      }
      if (isDir) {
        for (const file of walkMarkdownFiles(base)) addFile(docs, file)
      }
    }
    return docs
  }

  return {
    name: 'commonality-end-user-docs',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export default ${JSON.stringify(collectDocs())}`
      }
    },
    configureServer(server) {
      server.watcher.add(docsRoot)
      const onChange = (file: string) => {
        if (!file.startsWith(docsRoot)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}
