import type { ReactNode } from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export interface DomainHeroAction {
  label: string
  to: string
  variant?: 'contained' | 'outlined' | 'text'
}

export interface DomainLandingSectionCard {
  title: string
  description: string
  to: string
  cta: string
  eyebrow?: string
}

interface DomainLandingPageProps {
  eyebrow: string
  title: string
  description: string
  heroActions: DomainHeroAction[]
  spotlightLabel?: string
  spotlightText?: string
  sections: DomainLandingSectionCard[]
  children?: ReactNode
}

export function DomainLandingPage({
  eyebrow,
  title,
  description,
  heroActions,
  spotlightLabel,
  spotlightText,
  sections,
  children,
}: DomainLandingPageProps) {
  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 4,
          color: '#14213d',
          background:
            'linear-gradient(135deg, rgba(216, 243, 220, 0.96) 0%, rgba(247, 201, 72, 0.92) 100%)',
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
              {eyebrow}
            </Typography>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                mt: 1,
                fontWeight: 700,
                lineHeight: 1.1,
                fontSize: { xs: '2rem', md: '2.8rem' },
              }}
            >
              {title}
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ maxWidth: 780, fontWeight: 500 }}>
            {description}
          </Typography>
          {spotlightText ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              {spotlightLabel ? <Chip label={spotlightLabel} sx={{ width: 'fit-content', fontWeight: 700 }} /> : null}
              <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.9 }}>
                {spotlightText}
              </Typography>
            </Stack>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {heroActions.map((action) => (
              <Button
                key={`${action.to}:${action.label}`}
                component={RouterLink}
                to={action.to}
                variant={action.variant ?? 'contained'}
                color="inherit"
                sx={
                  action.variant === 'contained'
                    ? {
                        bgcolor: '#14213d',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: '#0f172a',
                        },
                      }
                    : undefined
                }
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {sections.map((section) => (
          <Paper key={section.title} sx={{ p: 3, borderRadius: 3 }}>
            {section.eyebrow ? (
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {section.eyebrow}
              </Typography>
            ) : null}
            <Typography variant="h6" sx={{ mb: 1 }}>
              {section.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {section.description}
            </Typography>
            <Button component={RouterLink} to={section.to} size="small">
              {section.cta}
            </Button>
          </Paper>
        ))}
      </Box>

      {children ? <Box sx={{ mt: 4 }}>{children}</Box> : null}
    </Box>
  )
}
