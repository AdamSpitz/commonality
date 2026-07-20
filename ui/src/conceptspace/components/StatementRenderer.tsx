import { Box, Paper, Typography, Alert, Link as MuiLink } from '@mui/material'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { Link as RouterLink } from 'react-router-dom'
import type { DisplayableDocument, Asset, DocumentReference } from '@commonality/sdk/displayable-documents'
import { isCidDeniedByDisplayDenylist, loadDisplayDenylist, type DisplayDenylist } from '../../shared'

interface StatementRendererProps {
  statementCid: string
  content: DisplayableDocument | null
  loading?: boolean
  error?: string | null
  unavailableSeverity?: 'warning' | 'error'
}

export function StatementRenderer({
  statementCid,
  content,
  loading = false,
  error = null,
  unavailableSeverity = 'error',
}: StatementRendererProps) {
  const [displayDenylist, setDisplayDenylist] = useState<DisplayDenylist>({ deniedCids: [], honoredRetractors: [] })

  useEffect(() => {
    let cancelled = false
    loadDisplayDenylist().then((denylist) => {
      if (!cancelled) setDisplayDenylist(denylist)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Loading statement content...
        </Typography>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity={unavailableSeverity}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Statement CID: {statementCid}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          A CID is the content-addressed IPFS identifier for this statement, so it helps developers verify exactly which statement failed to load.
        </Typography>
      </Paper>
    )
  }

  if (!content) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="warning">
          Statement content not found or could not be loaded from IPFS or PublishedData.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Statement CID: {statementCid}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          A CID is the content-addressed IPFS identifier for this statement, so it helps developers verify exactly which statement could not be loaded.
        </Typography>
      </Paper>
    )
  }

  if (isCidDeniedByDisplayDenylist(statementCid, displayDenylist)) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="warning">
          Statement suppressed by this site's display policy.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Statement CID: {statementCid}
        </Typography>
      </Paper>
    )
  }

  return <DisplayableDocumentRenderer doc={content} displayDenylist={displayDenylist} />
}

// ============================================================================
// DisplayableDocument renderer
// ============================================================================

function DisplayableDocumentRenderer({ doc, displayDenylist }: { doc: DisplayableDocument, displayDenylist: DisplayDenylist }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {/* Primary content */}
      <Box sx={{ mb: 2 }}>
        {doc.format === 'text/plain' ? (
          <PlainTextContent text={doc.content} />
        ) : (
          <MarkdownContent
            text={doc.content}
            assets={doc.assets}
            references={doc.references}
            displayDenylist={displayDenylist}
          />
        )}
      </Box>

      {/* References list */}
      {doc.references && doc.references.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            References:
          </Typography>
          {doc.references.map((ref, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">
                {index + 1}.{' '}
                {isCidDeniedByDisplayDenylist(ref.cid, displayDenylist) ? (
                  <Typography component="span" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    [reference suppressed by display policy]
                  </Typography>
                ) : (
                  <MuiLink component={RouterLink} to={`/document/${ref.cid}`}>
                    {ref.label || ref.cid}
                  </MuiLink>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

    </Paper>
  )
}

// ============================================================================
// Content renderers
// ============================================================================

function PlainTextContent({ text }: { text: string }) {
  return (
    <Typography
      variant="body1"
      component="pre"
      sx={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}
    >
      {text}
    </Typography>
  )
}

function MarkdownContent({
  text,
  assets,
  references,
  displayDenylist,
}: {
  text: string
  assets?: Record<string, Asset>
  references?: DocumentReference[]
  displayDenylist: DisplayDenylist
}) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ href, children, ...props }) => {
          // Resolve ref:N links to router links
          const refMatch = href?.match(/^ref:(\d+)$/)
          if (refMatch) {
            const refIndex = parseInt(refMatch[1], 10)
            const ref = references?.[refIndex]
            if (ref) {
              return (
                <MuiLink component={RouterLink} to={`/document/${ref.cid}`} {...props}>
                  {children}
                </MuiLink>
              )
            }
            // Missing reference — show error placeholder
            return (
              <Typography component="span" color="error.main" sx={{ fontStyle: 'italic' }} {...props}>
                [missing ref:{refMatch[1]}]
              </Typography>
            )
          }

          // Internal links (router)
          if (href?.startsWith('/')) {
            return (
              <MuiLink component={RouterLink} to={href} {...props}>
                {children}
              </MuiLink>
            )
          }

          // External URLs should have been stripped by validation,
          // but sanitize defensively: render as plain text
          return <span {...props}>{children}</span>
        },

        img: ({ src, alt, ...props }) => {
          // Resolve asset:key references
          const assetMatch = src?.match(/^asset:(.+)$/)
          if (assetMatch) {
            const assetKey = assetMatch[1]
            const asset = assets?.[assetKey]
            if (asset) {
              const resolvedSrc = resolveAssetSrc(asset, displayDenylist)
              if (resolvedSrc) {
                return <img src={resolvedSrc} alt={alt || assetKey} {...props} />
              }
            }
            // Missing or unresolvable asset — show placeholder
            return (
              <Typography component="span" color="error.main" sx={{ fontStyle: 'italic' }}>
                [missing asset: {assetKey}]
              </Typography>
            )
          }

          // External image URLs — strip (shouldn't pass validation, but be safe)
          return (
            <Typography component="span" color="error.main" sx={{ fontStyle: 'italic' }}>
              [external image blocked]
            </Typography>
          )
        },
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

function resolveAssetSrc(asset: Asset, displayDenylist: DisplayDenylist): string | null {
  if ('data' in asset) {
    // Inline base64 asset
    return `data:${asset.mimeType};base64,${asset.data}`
  }
  if ('cid' in asset) {
    if (isCidDeniedByDisplayDenylist(asset.cid, displayDenylist)) return null
    // CID-referenced asset — use IPFS gateway
    const gateway = import.meta.env?.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs'
    return `${gateway}/${asset.cid}`
  }
  return null
}

