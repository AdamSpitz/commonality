import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { IconButton, Tooltip } from '@mui/material'

export function HeaderInfoTip({
  title,
  label,
}: {
  title: string
  label: string
}) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        aria-label={label}
        sx={{ ml: 0.25, color: 'text.secondary' }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}
