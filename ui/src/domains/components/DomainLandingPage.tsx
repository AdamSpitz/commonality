import type { ReactNode } from 'react'
import { Box, Button, Paper, Stack, Typography, type ButtonProps, type SxProps, type Theme } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { getLinkHref, getLinkKey, isExternalLinkTarget, type LinkTarget } from '../../shared/linkTypes'

export type DomainHeroAction = LinkTarget & {
  label: string
  variant?: 'contained' | 'outlined' | 'text'
}

type OptionalLinkTarget =
  | LinkTarget
  | {
      path?: undefined
      href?: undefined
    }

export type DomainLandingSectionCard = OptionalLinkTarget & {
  title: string
  description: string
  cta?: string
  eyebrow?: string
}

export type DomainSpotlight = {
  label?: string
  text: string
}

interface DomainLandingPageProps {
  eyebrow?: string
  title: string
  description?: string
  heroActions?: DomainHeroAction[]
  spotlights?: DomainSpotlight[]
  sections?: DomainLandingSectionCard[]
  children?: ReactNode
}

type LandingButtonProps = {
  link: LinkTarget
  children: ReactNode
  variant?: ButtonProps['variant']
  color?: ButtonProps['color']
  size?: ButtonProps['size']
  sx?: SxProps<Theme>
}

function hasLinkTarget(section: DomainLandingSectionCard): section is DomainLandingSectionCard & LinkTarget {
  return Boolean(section.path ?? section.href)
}

function LandingButton({ link, children, ...buttonProps }: LandingButtonProps) {
  if (isExternalLinkTarget(link)) {
    return (
      <Button component="a" href={getLinkHref(link)} {...buttonProps}>
        {children}
      </Button>
    )
  }

  return (
    <Button component={RouterLink} to={link.path} {...buttonProps}>
      {children}
    </Button>
  )
}

export function DomainLandingPage({
  eyebrow,
  title,
  description,
  heroActions,
  spotlights,
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
            {eyebrow ? (
              <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
                {eyebrow}
              </Typography>
            ) : null}
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
          {description ? (
            <Typography variant="h6" sx={{ maxWidth: 780, fontWeight: 500 }}>
              {description}
            </Typography>
          ) : null}
          {spotlights?.map((spotlight, index) => (
            <Stack key={index} spacing={1} alignItems="flex-start">
              {spotlight.label ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {spotlight.label}
                </Typography>
              ) : null}
              <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.9 }}>
                {spotlight.text}
              </Typography>
            </Stack>
          ))}
          {heroActions?.length ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {heroActions.map((action) => (
                <LandingButton
                  key={getLinkKey(action, action.label)}
                  link={action}
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
                </LandingButton>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      {sections?.length ? (
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: section.cta && hasLinkTarget(section) ? 2 : 0 }}>
                {section.description}
              </Typography>
              {section.cta && hasLinkTarget(section) ? (
                <LandingButton link={section} size="small">
                  {section.cta}
                </LandingButton>
              ) : null}
            </Paper>
          ))}
        </Box>
      ) : null}

      {children ? <Box sx={{ mt: 4 }}>{children}</Box> : null}
    </Box>
  )
}
