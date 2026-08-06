import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'
import type { SafetyState } from '../lib/causeStore'

interface SafetyRejectionDialogProps {
  open: boolean
  fieldLabel?: string
  safety: SafetyState | null
  onClose: () => void
}

export function SafetyRejectionDialog({
  open,
  fieldLabel,
  safety,
  onClose,
}: SafetyRejectionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>This text can’t be saved</DialogTitle>
      <DialogContent>
        {fieldLabel && (
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {fieldLabel}
          </Typography>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          {safety?.explanation
            || 'This text does not meet our safety policy for operated surfaces.'}
        </DialogContentText>
        {safety?.category && safety.category !== 'ok' && (
          <Typography variant="caption" color="text.secondary">
            Policy area: {safety.category.replace(/_/g, ' ')}
          </Typography>
        )}
        <DialogContentText sx={{ mt: 2 }} variant="body2">
          Edit the text to remove the issue, or discard it. CauseStarter will not save or publish
          blocked text.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none' }}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  )
}
