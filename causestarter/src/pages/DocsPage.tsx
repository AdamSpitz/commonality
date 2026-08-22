import { Link as RouterLink, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import docModulesByRelativePath from 'virtual:end-user-docs'
import { ToolCard } from '../components/ToolCard'
import { SUPPORTING_TOOLS } from '../lib/tools'
import { getDomainUrl, type DomainId } from '../lib/domainUrls'

const docModules: Record<string, string> = docModulesByRelativePath

const DOMAIN_FOLDERS: ReadonlySet<string> = new Set([
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'civility',
  'common-sense-majority',
  'conceptspace',
  'causestarter',
])

interface LoadedDoc {
  content: string
  pathForRelativeLinks: string
}

function lookupMarkdown(internalPath: string): LoadedDoc | null {
  const normalized = internalPath.replace(/\/$/, '')
  const exact = `${normalized}.md`
  if (docModules[exact]) return { content: docModules[exact], pathForRelativeLinks: normalized }
  const readme = `${normalized}/README.md`
  if (docModules[readme]) {
    return { content: docModules[readme], pathForRelativeLinks: `${normalized}/README` }
  }
  const index = `${normalized}/index.md`
  if (docModules[index]) {
    return { content: docModules[index], pathForRelativeLinks: `${normalized}/index` }
  }
  return null
}

function getDocContent(docPath: string): LoadedDoc | null {
  const raw = docPath.replace(/^end-user\//, '').replace(/\/$/, '') || 'index'
  if (raw === 'index' || raw === 'causestarter') {
    return lookupMarkdown('causestarter')
  }
  const prefixed = [
    raw,
    raw.startsWith('causestarter/') ? null : `causestarter/${raw}`,
    raw.startsWith('commonality/') ? null : `commonality/${raw}`,
    raw.startsWith('shared/') ? null : `shared/${raw}`,
  ].filter((path): path is string => Boolean(path))
  for (const candidate of prefixed) {
    const found = lookupMarkdown(candidate)
    if (found) return found
  }
  return null
}

function normalizeDocsRoute(href: string): string {
  return href.replace(/\/README\.md$/, '').replace(/\.md$/, '').replace(/\/README$/, '')
}

function publicDocsRoute(internalPath: string): string {
  if (internalPath === 'causestarter' || internalPath === 'causestarter/index') return 'index'
  if (internalPath.startsWith('causestarter/')) return internalPath.slice('causestarter/'.length)
  if (internalPath === 'commonality') return 'vision-and-strategy'
  if (internalPath.startsWith('commonality/')) return internalPath.slice('commonality/'.length)
  if (internalPath.startsWith('shared/')) return internalPath.slice('shared/'.length)
  return internalPath
}

function docHomeDomain(internalPath: string): string | null {
  const top = internalPath.split('/')[0]
  if (top === 'shared' || top === 'causestarter' || top === 'commonality') return null
  return DOMAIN_FOLDERS.has(top) ? top : null
}

function buildDocHref(internalPath: string): string {
  const home = docHomeDomain(internalPath)
  const route = normalizeDocsRoute(`/docs/${publicDocsRoute(internalPath)}`)
  if (home) {
    return getDomainUrl(home as DomainId, route, route)
  }
  return route
}

function headingText(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(headingText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return headingText((children as { props: { children?: unknown } }).props.children)
  }
  return ''
}

function headingId(children: unknown): string {
  return headingText(children)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resolveHref(href: string, currentDocPath: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) return href
  if (href.startsWith('/docs/end-user/')) {
    return buildDocHref(href.replace('/docs/end-user/', ''))
  }
  if (href.startsWith('/docs/')) {
    return normalizeDocsRoute(href)
  }
  if (href.startsWith('/')) return href
  const currentDir = currentDocPath.includes('/')
    ? currentDocPath.substring(0, currentDocPath.lastIndexOf('/'))
    : ''
  const combined = currentDir ? `${currentDir}/${href}` : href
  const resolved: string[] = []
  for (const part of combined.split('/')) {
    if (part === '..') resolved.pop()
    else if (part !== '' && part !== '.') resolved.push(part)
  }
  return buildDocHref(resolved.join('/'))
}

export function DocsPage() {
  const { pathname } = useLocation()
  const docPath = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '') || 'index'
  const loadedDoc = getDocContent(docPath)
  const content = loadedDoc?.content ?? null
  const pathForRelativeLinks = loadedDoc?.pathForRelativeLinks ?? docPath

  const components: Components = {
    h1: ({ children }) => (
      <Typography variant="h4" gutterBottom sx={{ mt: 1, fontWeight: 800 }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography id={headingId(children)} variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 700 }}>
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography id={headingId(children)} variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 700 }}>
        {children}
      </Typography>
    ),
    p: ({ children }) => <Typography variant="body1" sx={{ mb: 2 }}>{children}</Typography>,
    ul: ({ children }) => (
      <Box component="ul" sx={{ pl: 3, mb: 2, '& li': { mb: 0.5 } }}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box component="ol" sx={{ pl: 3, mb: 2, '& li': { mb: 0.5 } }}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Typography component="li" variant="body1">
        {children}
      </Typography>
    ),
    a: ({ href, children }) => {
      const resolved = href ? resolveHref(href, pathForRelativeLinks) : '#'
      if (/^https?:\/\//.test(resolved)) {
        return (
          <a href={resolved} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )
      }
      return <RouterLink to={resolved}>{children}</RouterLink>
    },
    hr: () => <Divider sx={{ my: 3 }} />,
    blockquote: ({ children }) => (
      <Box
        component="blockquote"
        sx={{ borderLeft: 4, borderColor: 'grey.400', pl: 2, ml: 0, color: 'text.secondary', my: 2 }}
      >
        {children}
      </Box>
    ),
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  }

  if (!content) {
    return (
      <Box sx={{ maxWidth: 720 }} data-testid="docs-missing">
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            We could not find that guide.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Try the CauseStarter docs home, or the jobs catalog.
          </Typography>
          <Button component={RouterLink} to="/docs" variant="contained" sx={{ textTransform: 'none' }}>
            Back to docs home
          </Button>
        </Paper>
      </Box>
    )
  }

  const showExamples = docPath === 'index' || docPath === '' || docPath === 'causestarter'

  return (
    <Box sx={{ maxWidth: 720 }} data-testid="docs-page">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components}>
        {content}
      </ReactMarkdown>
      {showExamples && <DocsExampleTools />}
    </Box>
  )
}

function DocsExampleTools() {
  const sections = [
    {
      key: 'reference' as const,
      title: 'Example causes',
      description: 'Worked examples of focused causes you can learn from.',
    },
    {
      key: 'thesis' as const,
      title: 'On the other sites',
      description: 'Optional reading and tools. They open in their own UIs.',
    },
  ]
  return (
    <Stack spacing={3} sx={{ mt: 4 }} data-testid="docs-example-tools">
      {sections.map((section) => {
        const tools = SUPPORTING_TOOLS.filter((tool) => tool.kind === section.key)
        if (tools.length === 0) return null
        return (
          <Box key={section.key}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {section.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {section.description}
            </Typography>
            <Stack spacing={1.25}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
