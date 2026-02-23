import { Box, Paper, Typography, Alert, Link as MuiLink, Table, TableBody, TableRow, TableCell } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { Link as RouterLink } from 'react-router-dom'
import {
  type DisplayableDocument,
  type Asset,
  type DocumentReference,
} from '@commonality/sdk'

interface StatementRendererProps {
  statementCid: string
  content: DisplayableDocument | null
  loading?: boolean
  error?: string | null
}

export function StatementRenderer({
  statementCid,
  content,
  loading = false,
  error = null,
}: StatementRendererProps) {
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
        <Alert severity="error">
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Statement CID: {statementCid}
        </Typography>
      </Paper>
    )
  }

  if (!content) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="warning">
          Statement content not found or could not be loaded from IPFS.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Statement CID: {statementCid}
        </Typography>
      </Paper>
    )
  }

  return <DisplayableDocumentRenderer statementCid={statementCid} doc={content} />
}

// ============================================================================
// DisplayableDocument renderer
// ============================================================================

function DisplayableDocumentRenderer({
  statementCid,
  doc,
}: {
  statementCid: string
  doc: DisplayableDocument
}) {
  const knownFields = new Set(['format', 'content', 'assets', 'references', 'extras'])
  const unknownFields = Object.entries(doc as unknown as Record<string, unknown>)
    .filter(([key]) => !knownFields.has(key))

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
                <MuiLink component={RouterLink} to={`/document/${ref.cid}`}>
                  {ref.label || ref.cid}
                </MuiLink>
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Extras — always displayed in full per spec */}
      {doc.extras && Object.keys(doc.extras).length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Metadata:
          </Typography>
          <ExtrasTable extras={doc.extras} />
        </Box>
      )}

      {/* Unknown fields — rendered as raw JSON per spec */}
      {unknownFields.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Additional fields:
          </Typography>
          {unknownFields.map(([key, value]) => (
            <Box key={key} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">{key}:</Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 0.5 }}
              >
                {JSON.stringify(value, null, 2)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Statement CID: {statementCid}
        </Typography>
      </Box>
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
}: {
  text: string
  assets?: Record<string, Asset>
  references?: DocumentReference[]
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
              const resolvedSrc = resolveAssetSrc(asset)
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

function resolveAssetSrc(asset: Asset): string | null {
  if ('data' in asset) {
    // Inline base64 asset
    return `data:${asset.mimeType};base64,${asset.data}`
  }
  if ('cid' in asset) {
    // CID-referenced asset — use IPFS gateway
    const gateway = import.meta.env?.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs'
    return `${gateway}/${asset.cid}`
  }
  return null
}

// ============================================================================
// Extras display
// ============================================================================

function ExtrasTable({ extras }: { extras: Record<string, unknown> }) {
  return (
    <Table size="small" sx={{ '& td': { borderBottom: 'none', py: 0.5, px: 1 } }}>
      <TableBody>
        {Object.entries(extras).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold', verticalAlign: 'top', width: '1%', whiteSpace: 'nowrap' }}>
              <Typography variant="body2" color="text.secondary">{key}</Typography>
            </TableCell>
            <TableCell>
              {typeof value === 'string' ? (
                <Typography variant="body2">{value}</Typography>
              ) : (
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}
                >
                  {JSON.stringify(value, null, 2)}
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

