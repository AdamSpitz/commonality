import { Link, Stack, Typography } from '@mui/material'
import { AddressDisplay } from '@ui/shared'
import { parseContactUrl } from '../lib/causeRoster'

function contactLabel(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'mailto:') {
      return parsed.pathname || url.replace(/^mailto:/i, '')
    }
    return parsed.hostname.replace(/^www\./, '') + (parsed.pathname === '/' ? '' : parsed.pathname)
  } catch {
    return url
  }
}

interface OrganizerIdentityProps {
  address: string
  contactUrl?: string
}

/**
 * Public organizer identity: ENS/Twitter when published, optional contact URI.
 * Not an inbox — Commonality does not send (ADR 0011).
 */
export function OrganizerIdentity({ address, contactUrl }: OrganizerIdentityProps) {
  const contact = parseContactUrl(contactUrl)
  return (
    <Stack spacing={0.5} data-testid="organizer-identity" sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
        Organizer
      </Typography>
      <AddressDisplay address={address} variant="body2" />
      {contact && (
        <Link
          href={contact}
          data-testid="organizer-contact-url"
          underline="hover"
          rel="noopener noreferrer"
          target={contact.startsWith('mailto:') ? undefined : '_blank'}
          sx={{ fontSize: '0.875rem' }}
        >
          {contactLabel(contact)}
        </Link>
      )}
    </Stack>
  )
}
