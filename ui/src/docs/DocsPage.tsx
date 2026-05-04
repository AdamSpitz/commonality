import { useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import { Box, Typography, Divider } from '@mui/material'

// Bundle user-facing docs as raw strings at build time.
// Paths are relative to this file (ui/src/docs/ → ../../.. → project root → docs/).
// Intentionally excludes docs/chats/ (internal). Commonality's public vision
// narrative and CSM background docs are linked from the docs index, so bundle them too.
const docModules: Record<string, string> = {
  ...import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ...import.meta.glob('../../../docs/key-ideas/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ...import.meta.glob('../../../docs/use-case-walkthroughs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ...import.meta.glob('../../../docs/roles/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ...import.meta.glob('../../../docs/vision-and-strategy/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ...import.meta.glob('../../../docs/common-sense-majority/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
}

interface LoadedDoc {
  content: string
  pathForRelativeLinks: string
}

function getDocContent(docPath: string): LoadedDoc | null {
  const exact = `../../../docs/${docPath}.md`
  if (docModules[exact]) return { content: docModules[exact], pathForRelativeLinks: docPath }
  const normalizedDocPath = docPath.replace(/\/$/, '')
  const readme = `../../../docs/${normalizedDocPath}/README.md`
  if (docModules[readme]) {
    return { content: docModules[readme], pathForRelativeLinks: `${normalizedDocPath}/README` }
  }
  return null
}

function normalizeDocsRoute(href: string): string {
  return href.replace(/\/README\.md$/, '').replace(/\.md$/, '').replace(/\/README$/, '')
}

function resolveHref(href: string, currentDocPath: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) {
    return href
  }
  if (href.startsWith('/docs/')) {
    return normalizeDocsRoute(href)
  }
  if (href.startsWith('/')) {
    return href
  }
  const currentDir = currentDocPath.includes('/')
    ? currentDocPath.substring(0, currentDocPath.lastIndexOf('/'))
    : ''
  const combined = currentDir ? `${currentDir}/${href}` : href
  const resolved: string[] = []
  for (const part of combined.split('/')) {
    if (part === '..') resolved.pop()
    else if (part !== '' && part !== '.') resolved.push(part)
  }
  return normalizeDocsRoute('/docs/' + resolved.join('/'))
}

export function DocsPage() {
  const params = useParams()
  const docPath = params['*'] || 'index'
  const loadedDoc = getDocContent(docPath)
  const content = loadedDoc?.content ?? null
  const pathForRelativeLinks = loadedDoc?.pathForRelativeLinks ?? docPath

  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
          {children}
        </Typography>
      ),
      h2: ({ children }) => (
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          {children}
        </Typography>
      ),
      h3: ({ children }) => (
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
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
        if (resolved.startsWith('/docs/') || resolved.startsWith('#')) {
          return <RouterLink to={resolved}>{children}</RouterLink>
        }
        return (
          <a href={resolved} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )
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
      pre: ({ children }) => (
        <Box
          component="pre"
          sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', my: 2 }}
        >
          {children}
        </Box>
      ),
      code: ({ children, className }) => (
        <Box
          component="code"
          sx={
            className
              ? { fontFamily: 'monospace', fontSize: '0.875rem' }
              : { bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }
          }
        >
          {children}
        </Box>
      ),
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
    }),
    [pathForRelativeLinks],
  )

  if (!content) {
    return <Typography>Page not found.</Typography>
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  )
}
