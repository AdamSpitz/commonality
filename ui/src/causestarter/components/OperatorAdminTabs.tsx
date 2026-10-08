import { Box } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function OperatorAdminTabs({
  capability,
  active,
}: {
  capability: string
  active: 'test-data' | 'simulations'
}) {
  const query = capability ? `?key=${encodeURIComponent(capability)}` : ''
  const tabSx = (selected: boolean) => ({
    px: 0.5,
    py: 1,
    mb: '-1px',
    mr: 2,
    fontSize: 14,
    fontWeight: selected ? 700 : 600,
    color: selected ? 'primary.main' : 'text.secondary',
    textDecoration: 'none',
    borderBottom: '2px solid',
    borderColor: selected ? 'primary.main' : 'transparent',
    '&:hover': { color: selected ? 'primary.main' : 'text.primary', textDecoration: 'none' },
  })
  return (
    <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', mb: 3 }} data-testid="operator-admin-tabs">
      <Box component={RouterLink} to={`/admin/test-data${query}`} sx={tabSx(active === 'test-data')}>
        Test-data runs
      </Box>
      <Box component={RouterLink} to={`/admin/simulations${query}`} sx={tabSx(active === 'simulations')}>
        Simulations
      </Box>
    </Box>
  )
}
