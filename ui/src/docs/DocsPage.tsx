import { useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import { Box, Typography, Divider } from '@mui/material'

// Bundle public end-user docs as raw strings at build time.
// Paths are relative to this file (ui/src/docs/ → ../../.. → project root → docs/end-user/).
// Intentionally excludes internal docs such as docs/chats/ and specs/.
const docModules: Record<string, string> = {
  ...import.meta.glob('../../../docs/end-user/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
}

interface LoadedDoc {
  content: string
  pathForRelativeLinks: string
}

function getDefaultDocPath(): string {
  const domain = import.meta.env.VITE_DOMAIN
  if (domain === 'noninflammatory') return 'civility'
  if (
    domain === 'alignment' ||
    domain === 'commonality' ||
    domain === 'conceptspace' ||
    domain === 'content-funding' ||
    domain === 'csm' ||
    domain === 'pubstarter' ||
    domain === 'tally'
  ) {
    return domain
  }
  return 'commonality'
}

const ROLE_HOMES: Record<string, string> = {
  'express-what-you-care-about': 'tally',
  'fund-something': 'pubstarter',
  'get-your-project-funded': 'pubstarter',
  'pledge-to-a-cause': 'alignment',
  'become-a-delegate': 'alignment',
  'help-connect-things': 'alignment',
  'get-your-content-funded': 'content-funding',
}

function legacySharedDocPath(docPath: string): string {
  if (docPath === 'index') return 'commonality'
  if (docPath === 'for-crypto-natives') return 'shared/for-crypto-natives'
  if (docPath === 'why-trust-it') return 'commonality/why-trust-it'
  if (docPath === 'noninflammatory' || docPath.startsWith('noninflammatory/')) {
    return docPath.replace(/^noninflammatory/, 'civility')
  }
  if (docPath.startsWith('roles/')) {
    const slug = docPath.slice('roles/'.length)
    const home = ROLE_HOMES[slug]
    if (home) return `${home}/${slug}`
  }
  if (
    docPath.startsWith('key-ideas') ||
    docPath.startsWith('use-case-walkthroughs')
  ) {
    return `shared/${docPath}`
  }
  if (docPath.startsWith('vision-and-strategy')) return `commonality/${docPath}`
  if (docPath.startsWith('common-sense-majority')) return docPath.replace(/^common-sense-majority/, 'csm')
  return docPath
}

function getDocContent(docPath: string): LoadedDoc | null {
  const normalizedDocPath = legacySharedDocPath(docPath.replace(/^end-user\//, '').replace(/\/$/, ''))
  const exact = `../../../docs/end-user/${normalizedDocPath}.md`
  if (docModules[exact]) return { content: docModules[exact], pathForRelativeLinks: normalizedDocPath }
  const readme = `../../../docs/end-user/${normalizedDocPath}/README.md`
  if (docModules[readme]) {
    return { content: docModules[readme], pathForRelativeLinks: `${normalizedDocPath}/README` }
  }
  const index = `../../../docs/end-user/${normalizedDocPath}/index.md`
  if (docModules[index]) {
    return { content: docModules[index], pathForRelativeLinks: `${normalizedDocPath}/index` }
  }
  return null
}

function normalizeDocsRoute(href: string): string {
  return href.replace(/\/README\.md$/, '').replace(/\.md$/, '').replace(/\/README$/, '')
}

function publicDocsRoute(docPath: string): string {
  if (docPath === 'commonality') return 'index'
  if (docPath.startsWith('commonality/')) return docPath.replace(/^commonality\//, '')
  if (docPath.startsWith('shared/')) return docPath.replace(/^shared\//, '')
  if (docPath.startsWith('csm/')) return docPath.replace(/^csm/, 'common-sense-majority')
  if (docPath === 'csm') return 'common-sense-majority'
  if (docPath.startsWith('civility/')) return docPath.replace(/^civility/, 'noninflammatory')
  if (docPath === 'civility') return 'noninflammatory'
  return docPath
}

function resolveHref(href: string, currentDocPath: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) {
    return href
  }
  if (href.startsWith('/docs/end-user/')) {
    const docPath = href.replace('/docs/end-user/', '')
    return normalizeDocsRoute(`/docs/${publicDocsRoute(docPath)}`)
  }
  if (href.startsWith('/docs/')) {
    const docPath = href.replace('/docs/', '')
    return normalizeDocsRoute(`/docs/${publicDocsRoute(docPath)}`)
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
  return normalizeDocsRoute('/docs/' + publicDocsRoute(resolved.join('/')))
}

export function DocsPage() {
  const params = useParams()
  const docPath = params['*'] || getDefaultDocPath()
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
