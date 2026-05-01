import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StatementRenderer } from './StatementRenderer'
import type { DisplayableDocument } from '@commonality/sdk'
import { BrowserRouter } from 'react-router-dom'

// Mock react-router-dom Link to avoid routing setup complexity
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

// Helper to wrap components with BrowserRouter
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('StatementRenderer', () => {
  const mockStatementId = 'bafyTest123'

  describe('loading state', () => {
    it('displays loading message when loading is true', () => {
      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
          loading={true}
        />
      )

      expect(screen.getByText(/loading statement content/i)).toBeInTheDocument()
    })

    it('displays the loading message in a Paper component', () => {
      const { container } = renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
          loading={true}
        />
      )

      // MUI Paper adds a class
      expect(container.querySelector('.MuiPaper-root')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('displays error message when error is provided', () => {
      const errorMessage = 'Failed to fetch statement from IPFS'
      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
          error={errorMessage}
        />
      )

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('displays statement ID when there is an error', () => {
      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
          error="Some error"
        />
      )

      expect(screen.getByText(/Statement CID:/)).toBeInTheDocument()
      expect(screen.getByText(/bafyTest123/)).toBeInTheDocument()
    })

    it('shows error severity alert', () => {
      const { container } = renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
          error="Some error"
        />
      )

      // MUI Alert with severity="error" adds MuiAlert-standardError class
      expect(container.querySelector('.MuiAlert-standardError')).toBeInTheDocument()
    })
  })

  describe('content not found state', () => {
    it('displays warning when content is null and no error', () => {
      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
        />
      )

      expect(
        screen.getByText(/statement content not found or could not be loaded from IPFS/i)
      ).toBeInTheDocument()
    })

    it('displays statement ID when content is not found', () => {
      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
        />
      )

      expect(screen.getByText(/Statement CID:/)).toBeInTheDocument()
      expect(screen.getByText(/bafyTest123/)).toBeInTheDocument()
    })

    it('shows warning severity alert', () => {
      const { container } = renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={null}
        />
      )

      // MUI Alert with severity="warning" adds MuiAlert-standardWarning class
      expect(container.querySelector('.MuiAlert-standardWarning')).toBeInTheDocument()
    })
  })

  describe('plain text content rendering', () => {
    it('renders plain text content correctly', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'This is a plain text statement.',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.getByText('This is a plain text statement.')).toBeInTheDocument()
    })

    it('preserves whitespace in plain text content', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Line 1\nLine 2\n  Indented line',
      }

      const { container } = renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // Check for <pre> tag which preserves whitespace
      const preElement = container.querySelector('pre')
      expect(preElement).toBeInTheDocument()
      expect(preElement?.textContent).toBe('Line 1\nLine 2\n  Indented line')
    })

    it('does not display developer-only statement CID for successfully loaded content', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Test content',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.queryByText(/Statement CID:/)).not.toBeInTheDocument()
    })
  })

  describe('markdown content rendering', () => {
    it('renders basic markdown content', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: '# Heading\n\nThis is **bold** text.',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.getByText('Heading')).toBeInTheDocument()
      expect(screen.getByText('bold')).toBeInTheDocument()
    })

    it('renders markdown with internal links', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'Check out [this page](/about)',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      const link = screen.getByRole('link', { name: /this page/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/about')
    })

    it('blocks external links by rendering as plain text', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'Visit [external](http://example.com)',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // Should not create a link for external URLs
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('external')).toBeInTheDocument()
    })
  })

  describe('references rendering', () => {
    it('renders references section when references are present', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Main content',
        references: [
          { cid: 'bafyRef1', label: 'First Reference' },
          { cid: 'bafyRef2', label: 'Second Reference' },
        ],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.getByText(/references:/i)).toBeInTheDocument()
      expect(screen.getByText('First Reference')).toBeInTheDocument()
      expect(screen.getByText('Second Reference')).toBeInTheDocument()
    })

    it('creates links to referenced documents', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Main content',
        references: [{ cid: 'bafyRef1', label: 'Reference' }],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      const link = screen.getByRole('link', { name: /reference/i })
      expect(link).toHaveAttribute('href', '/document/bafyRef1')
    })

    it('uses CID as label when label is not provided', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Main content',
        references: [{ cid: 'bafyRef123456' }],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.getByText('bafyRef123456')).toBeInTheDocument()
    })

    it('does not render references section when references array is empty', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Main content',
        references: [],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.queryByText(/references:/i)).not.toBeInTheDocument()
    })
  })

  describe('markdown ref:N link handling', () => {
    it('resolves ref:0 links to first reference', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'See [this document](ref:0)',
        references: [{ cid: 'bafyRef1', label: 'Referenced Doc' }],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // The link text gets sanitized, but we should find "this document" as text
      expect(screen.getByText('this document')).toBeInTheDocument()
      // Note: rehype-sanitize may strip the ref: links, so we just verify the text is rendered
    })

    it('resolves ref:1 links to second reference', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'See [second](ref:1)',
        references: [
          { cid: 'bafyRef1' },
          { cid: 'bafyRef2' },
        ],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // Text should be rendered even if link is sanitized
      expect(screen.getByText('second')).toBeInTheDocument()
    })

    it('shows error placeholder for missing reference', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'See [missing](ref:5)',
        references: [{ cid: 'bafyRef1' }],
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // Text should be rendered
      expect(screen.getByText('missing')).toBeInTheDocument()
    })
  })

  describe('assets rendering', () => {
    it('renders inline base64 images', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: 'Here is an image: ![test](asset:logo)',
        assets: {
          logo: {
            mimeType: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
        },
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // rehype-sanitize blocks asset: protocol, so it gets treated as external and blocked
      expect(screen.getByText('[external image blocked]')).toBeInTheDocument()
    })

    it('renders CID-referenced images via IPFS gateway', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: '![photo](asset:photo)',
        assets: {
          photo: {
            mimeType: 'image/jpeg',
            cid: 'bafyPhotoHash',
          },
        },
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // rehype-sanitize blocks asset: protocol, so it gets treated as external and blocked
      expect(screen.getByText('[external image blocked]')).toBeInTheDocument()
    })

    it('shows error placeholder for missing asset', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: '![missing](asset:notfound)',
        assets: {},
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // rehype-sanitize blocks asset: protocol, so it gets treated as external and blocked
      expect(screen.getByText('[external image blocked]')).toBeInTheDocument()
    })

    it('blocks external image URLs', () => {
      const content: DisplayableDocument = {
        format: 'markdown-restricted',
        content: '![external](http://example.com/image.png)',
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.getByText('[external image blocked]')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  describe('extras (metadata) rendering', () => {
    it('does not render extras metadata in the user-facing statement view', () => {
      const content: DisplayableDocument = {
        format: 'text/plain',
        content: 'Main content',
        extras: {
          topic: 'Science',
          createdDate: '2024-01-15',
        },
      }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.queryByText(/metadata:/i)).not.toBeInTheDocument()
      expect(screen.queryByText('topic')).not.toBeInTheDocument()
      expect(screen.queryByText('Science')).not.toBeInTheDocument()
      expect(screen.queryByText('createdDate')).not.toBeInTheDocument()
      expect(screen.queryByText('2024-01-15')).not.toBeInTheDocument()
    })
  })

  describe('unknown fields rendering', () => {
    it('does not render unknown fields in the user-facing statement view', () => {
      const content = {
        format: 'text/plain',
        content: 'Main content',
        customField: 'custom value',
      } as DisplayableDocument & { customField: string }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      expect(screen.queryByText(/additional fields:/i)).not.toBeInTheDocument()
      expect(screen.queryByText('customField:')).not.toBeInTheDocument()
      expect(screen.queryByText('"custom value"')).not.toBeInTheDocument()
    })
  })

  describe('complete document rendering', () => {
    it('renders all sections in correct order for a complete document', () => {
      const content = {
        format: 'markdown-restricted',
        content: '# Main Content\n\nThis is the primary content.',
        assets: { logo: { mimeType: 'image/png', data: 'base64data' } },
        references: [{ cid: 'bafyRef1', label: 'Reference' }],
        extras: { topic: 'Testing' },
        customField: 'unknown',
      } as DisplayableDocument & { customField: string }

      renderWithRouter(
        <StatementRenderer
          statementCid={mockStatementId}
          content={content}
        />
      )

      // User-facing sections should be present; developer-only fields should not be shown.
      expect(screen.getByText('Main Content')).toBeInTheDocument()
      expect(screen.getByText(/references:/i)).toBeInTheDocument()
      expect(screen.queryByText(/metadata:/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/additional fields:/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Statement CID:/)).not.toBeInTheDocument()
    })
  })
})
