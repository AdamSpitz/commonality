import { Alert, Stack, Typography } from '@mui/material'
import { WalletButton } from './WalletButton'

export function ConnectWalletHint({ children }: { children: string }) {
  return (
    <Alert
      severity="info"
      data-testid="connect-wallet-hint"
      sx={{
        borderRadius: 2,
        py: 0.5,
        px: 1.25,
        alignItems: 'center',
        '& .MuiAlert-icon': { py: 0, mr: 1, fontSize: 20 },
        '& .MuiAlert-message': { py: 0, width: '100%' },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
      >
        <Typography variant="body2">{children}</Typography>
        <WalletButton dense testId="inline-wallet-connect" />
      </Stack>
    </Alert>
  )
}
