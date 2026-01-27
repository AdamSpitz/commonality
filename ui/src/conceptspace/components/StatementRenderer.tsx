import { Box, Paper, Typography, Alert, Link as MuiLink } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { Link as RouterLink } from 'react-router-dom'
import { type StatementContent } from '@commonality/sdk'

interface StatementRendererProps {
  statementId: string
  content: StatementContent | null
  loading?: boolean
  error?: string | null
}

export function StatementRenderer({
  statementId,
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
          Statement ID: {statementId}
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
          Statement ID: {statementId}
        </Typography>
      </Paper>
    )
  }

  // Process content to replace {ref:N} placeholders with links
  const processContent = (text: string): string => {
    if (!content.references || content.references.length === 0) {
      return text
    }

    let processedText = text
    content.references.forEach((ref, index) => {
      const placeholder = `{ref:${index}}`
      const label = ref.label || `Statement ${index + 1}`
      // Create markdown link to the referenced statement
      const link = `[${label}](/statement/${ref.statementId})`
      processedText = processedText.replace(placeholder, link)
    })

    return processedText
  }

  const processedContent = processContent(content.content || '')

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {content.title && (
        <Typography variant="h5" component="h2" gutterBottom>
          {content.title}
        </Typography>
      )}

      <Box sx={{ mb: 2 }}>
        <ReactMarkdown
          rehypePlugins={[rehypeSanitize]}
          components={{
            // Custom link renderer to use React Router for internal links
            a: ({ node, href, children, ...props }) => {
              if (href?.startsWith('/')) {
                return (
                  <MuiLink component={RouterLink} to={href} {...props}>
                    {children}
                  </MuiLink>
                )
              }
              return (
                <MuiLink href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </MuiLink>
              )
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </Box>

      {content.references && content.references.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            References:
          </Typography>
          {content.references.map((ref, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">
                {index + 1}.{' '}
                <MuiLink component={RouterLink} to={`/statement/${ref.statementId}`}>
                  {ref.label || ref.statementId}
                </MuiLink>
                {ref.relationship && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({ref.relationship})
                  </Typography>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Statement ID: {statementId}
        </Typography>
        {content.metadata?.createdDate && (
          <Typography variant="caption" color="text.secondary" display="block">
            Created: {new Date(content.metadata.createdDate).toLocaleString()}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
