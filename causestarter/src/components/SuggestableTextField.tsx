import { useState } from 'react'
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  type TextFieldProps,
} from '@mui/material'
import SouthWestIcon from '@mui/icons-material/SouthWest'
import AutorenewIcon from '@mui/icons-material/Autorenew'

export interface SuggestableTextFieldProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  /** Current suggestion shown in the placeholder / applied by the arrow. */
  suggestion: string
  /** Called when the user asks for a new suggestion (AI / regenerate). */
  onRegenerate: () => void | Promise<void>
  useExampleLabel?: string
  regenerateLabel?: string
}

/**
 * Text field with subtle end adornments:
 * - corner arrow: fill the field with the current suggestion
 * - circular arrow: regenerate the suggestion (and fill if empty / was suggestion)
 */
export function SuggestableTextField({
  value,
  onChange,
  suggestion,
  onRegenerate,
  useExampleLabel = 'Use this example',
  regenerateLabel = 'Suggest another',
  multiline,
  ...rest
}: SuggestableTextFieldProps) {
  const [regenerating, setRegenerating] = useState(false)

  const applySuggestion = () => {
    if (!suggestion.trim()) return
    onChange(suggestion)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const previousSuggestion = suggestion
      await onRegenerate()
      // If the field was empty or still held the old suggestion, adopt the new one
      // after the parent updates suggestion. We rely on parent regenerating then
      // optionally the parent can also set value; here we re-apply after a tick
      // using the latest suggestion via onRegenerate side effect in parent.
      // Parent is expected to return/update suggestion; StartCausePage handles fill.
      void previousSuggestion
    } finally {
      setRegenerating(false)
    }
  }

  const adornment = (
    <InputAdornment
      position="end"
      sx={{
        alignItems: multiline ? 'flex-start' : 'center',
        height: multiline ? '100%' : undefined,
        maxHeight: 'none',
        mt: multiline ? 0.5 : 0,
      }}
    >
      <Stack direction="row" spacing={0.25}>
        <Tooltip title={useExampleLabel} enterDelay={400}>
          <span>
            <IconButton
              size="small"
              aria-label={useExampleLabel}
              onClick={applySuggestion}
              disabled={!suggestion.trim()}
              edge="end"
              sx={{
                opacity: 0.45,
                color: 'text.secondary',
                '&:hover': { opacity: 1, color: 'primary.main', bgcolor: 'action.hover' },
                '&.Mui-disabled': { opacity: 0.2 },
              }}
            >
              <SouthWestIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={regenerateLabel} enterDelay={400}>
          <span>
            <IconButton
              size="small"
              aria-label={regenerateLabel}
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
              edge="end"
              sx={{
                opacity: 0.45,
                color: 'text.secondary',
                '&:hover': { opacity: 1, color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              {regenerating
                ? <CircularProgress size={16} color="inherit" />
                : <AutorenewIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </InputAdornment>
  )

  return (
    <TextField
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline={multiline}
      placeholder={suggestion || rest.placeholder}
      InputProps={{
        ...rest.InputProps,
        endAdornment: adornment,
      }}
    />
  )
}
