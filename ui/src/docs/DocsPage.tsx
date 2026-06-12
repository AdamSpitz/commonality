import { useParams, Link as RouterLink } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import { Box, Typography, Divider } from '@mui/material'
import docModulesByRelativePath from 'virtual:end-user-docs'
import { resolveLinkHref } from '../domains/domainUrls'
import { RetroFundingStory } from '../domains/lazy-giving/RetroFundingStory'

// Public end-user docs for THIS build, keyed by path relative to docs/end-user/
// (e.g. "shared/key-ideas/delegation.md"). Each branded build bundles only the
// shared/ tier plus its own product folder (see endUserDocsPlugin); docs owned
// by other products are reached through cross-domain links.
const docModules: Record<string, string> = docModulesByRelativePath

// Top-level doc folders that correspond to a branded site. Everything except
// `shared/` is owned by one of these domains; a link into another domain's
// folder becomes a cross-domain link rather than an in-site route.
const DOMAIN_FOLDERS: ReadonlySet<string> = new Set([
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'civility',
  'common-sense-majority',
  'conceptspace',
])

function currentDomain(): string {
  const domain = import.meta.env.VITE_DOMAIN
  return typeof domain === 'string' && DOMAIN_FOLDERS.has(domain) ? domain : 'commonality'
}

// Given an internal doc path (relative to docs/end-user/, possibly with a .md or
// README suffix), returns the domain that owns it, or null for the shared tier.
function docHomeDomain(internalPath: string): string | null {
  const top = internalPath.split('/')[0]
  if (top === 'shared') return null
  return DOMAIN_FOLDERS.has(top) ? top : null
}

interface LoadedDoc {
  content: string
  pathForRelativeLinks: string
}

function getDefaultDocPath(): string {
  const domain = import.meta.env.VITE_DOMAIN
  if (domain === 'civility') return 'civility'
  if (
    domain === 'alignment' ||
    domain === 'commonality' ||
    domain === 'conceptspace' ||
    domain === 'content-funding' ||
    domain === 'common-sense-majority' ||
    domain === 'lazyGiving' ||
    domain === 'tally'
  ) {
    return domain
  }
  return 'commonality'
}

// Key-idea pages that used to live in shared/key-ideas/ but now belong to a
// specific product. Old /docs/key-ideas/<slug> links redirect to the new home.
const MOVED_KEY_IDEAS: Record<string, string> = {
  'assurance-contracts': 'lazyGiving',
  'retroactive-funding': 'lazyGiving',
  'credible-threats': 'lazyGiving',
  'statements-and-implication-graph': 'tally',
  'content-funding': 'content-funding',
  'how-actions-compound': 'commonality',
}

const ROLE_HOMES: Record<string, string> = {
  'express-what-you-care-about': 'tally',
  'fund-something': 'lazyGiving',
  'get-your-project-funded': 'lazyGiving',
  'pledge-to-a-cause': 'alignment',
  'become-a-delegate': 'alignment',
  'help-connect-things': 'alignment',
  'get-your-content-funded': 'content-funding',
}

function legacySharedDocPath(docPath: string): string {
  if (docPath === 'index') return 'commonality'
  if (docPath === 'for-crypto-natives') return 'shared/for-crypto-natives'
  if (docPath === 'why-trust-it') return 'commonality/why-trust-it'
  if (docPath === 'how-actions-compound') return 'commonality/how-actions-compound'
  if (docPath === 'civility' || docPath.startsWith('noninflammatory/')) {
    return docPath.replace(/^noninflammatory/, 'civility')
  }
  if (docPath.startsWith('roles/')) {
    const slug = docPath.slice('roles/'.length)
    const home = ROLE_HOMES[slug]
    if (home) return `${home}/${slug}`
  }
  if (docPath.startsWith('key-ideas/')) {
    const slug = docPath.slice('key-ideas/'.length)
    const home = MOVED_KEY_IDEAS[slug]
    if (home) return `${home}/${slug}`
  }
  if (
    docPath.startsWith('key-ideas') ||
    docPath.startsWith('use-case-walkthroughs')
  ) {
    return `shared/${docPath}`
  }
  if (docPath.startsWith('vision-and-strategy')) return `commonality/${docPath}`
  if (docPath.startsWith('common-sense-majority')) return docPath
  return docPath
}

function getDocContent(docPath: string): LoadedDoc | null {
  const normalizedDocPath = legacySharedDocPath(docPath.replace(/^end-user\//, '').replace(/\/$/, ''))
  const exact = `${normalizedDocPath}.md`
  if (docModules[exact]) return { content: docModules[exact], pathForRelativeLinks: normalizedDocPath }
  const readme = `${normalizedDocPath}/README.md`
  if (docModules[readme]) {
    return { content: docModules[readme], pathForRelativeLinks: `${normalizedDocPath}/README` }
  }
  const index = `${normalizedDocPath}/index.md`
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
  if (docPath === 'common-sense-majority') return 'common-sense-majority'
  if (docPath.startsWith('civility/')) return docPath.replace(/^civility/, 'civility')
  if (docPath === 'civility') return 'civility'
  return docPath
}

// Turns an internal doc path (relative to docs/end-user/) into a final href.
// Same-domain and shared docs resolve to an in-site /docs/ route; docs owned by
// another product resolve to a cross-domain URL.
function buildDocHref(internalPath: string): string {
  const route = normalizeDocsRoute(`/docs/${publicDocsRoute(internalPath)}`)
  const home = docHomeDomain(internalPath)
  if (home && home !== currentDomain()) {
    return resolveLinkHref({ domain: home, path: route })
  }
  return route
}

function resolveHref(href: string, currentDocPath: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) {
    return href
  }
  if (href.startsWith('/docs/end-user/')) {
    return buildDocHref(href.replace('/docs/end-user/', ''))
  }
  if (href.startsWith('/docs/')) {
    // Already a public route; can't recover its home domain, so keep it in-site.
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
  return buildDocHref(resolved.join('/'))
}

export function DocsPage() {
  const params = useParams()
  const docPath = params['*'] || getDefaultDocPath()
  const loadedDoc = getDocContent(docPath)
  const content = loadedDoc?.content ?? null
  const pathForRelativeLinks = loadedDoc?.pathForRelativeLinks ?? docPath
  const retroFundingIframePattern = /\n<iframe\n {2}src="\.\.\/shared\/diagrams\/retro-funding-story\.poc\.html\?embed=1"[\s\S]*?\n><\/iframe>\n/
  const contentParts = content?.split(retroFundingIframePattern) ?? []
  const showRetroFundingStory = Boolean(content?.match(retroFundingIframePattern))

  const components: Components = {
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
      // Absolute URLs (external links and resolved cross-domain links) open in
      // a new tab; in-site routes (/docs/, the cross-domain-unavailable page,
      // anchors) use the router.
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
  }

  if (!content) {
    return <Typography>Page not found.</Typography>
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      {contentParts.map((part, index) => (
        <Box key={index}>
          <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components}>
            {part}
          </ReactMarkdown>
          {showRetroFundingStory && index < contentParts.length - 1 ? <RetroFundingStory /> : null}
        </Box>
      ))}
    </Box>
  )
}
