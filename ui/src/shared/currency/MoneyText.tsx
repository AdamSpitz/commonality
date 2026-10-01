import { Fragment } from 'react'
import { Box, Tooltip } from '@mui/material'

export const USDZZZ_TOOLTIP = 'USDZZZ is play money for this testnet. It is not US dollars, and it cannot be cashed out.'

/** Renders a money string, with an explanation on every USDZZZ symbol. */
export function MoneyText({ text }: { text: string }) {
  const parts = text.split(/(USDZZZ)/g)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, index) => part === 'USDZZZ' ? (
        <Tooltip key={index} title={USDZZZ_TOOLTIP} placement="top">
          <Box
            component="abbr"
            aria-label={USDZZZ_TOOLTIP}
            sx={{ textDecoration: 'underline dotted', cursor: 'help' }}
          >
            USDZZZ
          </Box>
        </Tooltip>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  )
}
