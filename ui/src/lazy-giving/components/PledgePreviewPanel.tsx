import { Paper, Typography, Stack, Box, Alert } from '@mui/material'
import type { ProjectToken } from '@commonality/sdk/lazy-giving'
import { formatCurrencyAmount } from '../../shared'
import { WalletButton } from '../../shared/components/WalletButton'

interface PledgePreviewPanelProps {
  tokens: ProjectToken[]
  tokenImages?: Record<string, string>
}

// Read-only preview of a project's giving options shown to visitors who have not
// connected a wallet. It lets people understand the prices and the
// contribution/refund mechanics before deciding to connect — connecting reveals
// the interactive BuyTokensSection in its place.
export function PledgePreviewPanel({ tokens, tokenImages = {} }: PledgePreviewPanelProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Give to this project
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Your contribution counts toward the funding goal; if the project does not reach its goal by the deadline, you can get a refund. If it succeeds, the creator can withdraw the pooled funds and your onchain tokens remain your receipt/reward.
      </Typography>

      {tokens.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Giving options</Typography>
          {tokens.map((token) => (
            <Box key={token.tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {tokenImages[token.tokenId] && (
                <Box
                  component="img"
                  src={tokenImages[token.tokenId]}
                  alt={`Giving option #${token.tokenId}`}
                  sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                />
              )}
              <Typography variant="body1" sx={{ minWidth: 120 }}>
                Giving option #{token.tokenId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrencyAmount(token.price, token.currency)} each
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          This project is still funding, but no giving options are indexed yet. Check back after the project creator finishes setup or after the indexer catches up.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect your wallet to give to this project.
      </Typography>
      <WalletButton />
    </Paper>
  )
}
