import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { CauseStatement, SafetyState } from '../lib/causeStore'

interface StatementWorkbenchProps {
  statements: CauseStatement[]
  onChange: (statements: CauseStatement[]) => void
  onRequestSuggestions: () => void
  suggesting: boolean
  onShowSafety: (label: string, safety: SafetyState) => void
  disabled?: boolean
}

function safetyBorder(safety?: SafetyState) {
  if (!safety || safety.allowed) return 'divider'
  return 'error.main'
}

export function StatementWorkbench({
  statements,
  onChange,
  onRequestSuggestions,
  suggesting,
  onShowSafety,
  disabled,
}: StatementWorkbenchProps) {
  const update = (id: string, patch: Partial<CauseStatement>) => {
    onChange(statements.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const remove = (id: string) => {
    onChange(statements.filter((s) => s.id !== id))
  }

  const addBlank = () => {
    onChange([
      ...statements,
      {
        id: crypto.randomUUID(),
        text: '',
        origin: 'user',
        disposition: 'adopted',
      },
    ])
  }

  const pending = statements.filter((s) => s.disposition === 'pending')
  const adopted = statements.filter((s) => s.disposition === 'adopted')
  const rejected = statements.filter((s) => s.disposition === 'rejected')

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          size="small"
          startIcon={suggesting ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          onClick={onRequestSuggestions}
          disabled={disabled || suggesting}
          sx={{ textTransform: 'none', borderRadius: 999 }}
        >
          {suggesting ? 'Suggesting…' : 'Suggest statements'}
        </Button>
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon />}
          onClick={addBlank}
          disabled={disabled}
          sx={{ textTransform: 'none' }}
        >
          Add your own
        </Button>
        <Typography variant="caption" color="text.secondary">
          Optional. Each must already be implied by the main statement.
        </Typography>
      </Stack>

      {pending.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Suggestions — adopt, edit, or reject
          </Typography>
          <Stack spacing={1.25}>
            {pending.map((statement) => (
              <Paper
                key={statement.id}
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: safetyBorder(statement.safety),
                  bgcolor: statement.safety && !statement.safety.allowed ? 'error.50' : 'background.paper',
                  ...(!statement.safety?.allowed && statement.safety
                    ? { backgroundColor: (t) => t.palette.mode === 'light' ? 'rgba(211,47,47,0.06)' : 'rgba(244,67,54,0.12)' }
                    : {}),
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label="Suggested" variant="outlined" />
                    {statement.role && <Chip size="small" label={statement.role} />}
                    {statement.implication && statement.implication.implies && statement.implication.confidence !== 'low' && (
                      <Chip size="small" color="success" variant="outlined" label="Implied by main" />
                    )}
                    {statement.implication && !statement.implication.implies && statement.implication.confidence !== 'low' && (
                      <Chip size="small" color="warning" label="Not clearly implied" />
                    )}
                    {statement.safety && !statement.safety.allowed && (
                      <Chip
                        size="small"
                        color="error"
                        label="Blocked"
                        onClick={() => onShowSafety('Suggested statement', statement.safety!)}
                        onDelete={() => onShowSafety('Suggested statement', statement.safety!)}
                        deleteIcon={<InfoOutlinedIcon />}
                      />
                    )}
                  </Stack>
                  <TextField
                    value={statement.text}
                    onChange={(e) => update(statement.id, {
                      text: e.target.value,
                      safety: undefined,
                      implication: undefined,
                      origin: 'suggested',
                    })}
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={disabled}
                    error={Boolean(statement.safety && !statement.safety.allowed)}
                  />
                  {statement.rationale && (
                    <Typography variant="caption" color="text.secondary">
                      Why this fits: {statement.rationale}
                    </Typography>
                  )}
                  {statement.implication && !statement.implication.implies && (
                    <Typography variant="caption" color="warning.main">
                      Implication check: {statement.implication.reasoning}
                      {statement.implication.keyDifference
                        ? ` (${statement.implication.keyDifference})`
                        : ''}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckIcon />}
                      disabled={disabled || Boolean(statement.safety && !statement.safety.allowed)}
                      onClick={() => update(statement.id, { disposition: 'adopted' })}
                      sx={{ textTransform: 'none' }}
                    >
                      Adopt
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CloseIcon />}
                      disabled={disabled}
                      onClick={() => update(statement.id, { disposition: 'rejected' })}
                      sx={{ textTransform: 'none' }}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Your statements ({adopted.length})
        </Typography>
        {adopted.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Adopt suggestions or add your own. Only keep claims the main statement already implies —
            people who believe the main one should already believe these.
          </Alert>
        ) : (
          <Stack spacing={1.25}>
            {adopted.map((statement) => (
              <Paper
                key={statement.id}
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: '2px solid',
                  borderColor: safetyBorder(statement.safety),
                  ...(!statement.safety?.allowed && statement.safety
                    ? { backgroundColor: (t) => t.palette.mode === 'light' ? 'rgba(211,47,47,0.06)' : 'rgba(244,67,54,0.12)' }
                    : {}),
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip size="small" color="primary" variant="outlined" label={statement.origin === 'user' ? 'Yours' : 'Adopted'} />
                      {statement.implication && statement.implication.implies && statement.implication.confidence !== 'low' && (
                        <Chip size="small" color="success" variant="outlined" label="Implied by main" />
                      )}
                      {statement.implication && !statement.implication.implies && statement.implication.confidence !== 'low' && (
                        <Chip size="small" color="warning" label="Not clearly implied" />
                      )}
                      {statement.safety && !statement.safety.allowed && (
                        <Chip
                          size="small"
                          color="error"
                          label="Blocked — tap for why"
                          onClick={() => onShowSafety('Statement', statement.safety!)}
                        />
                      )}
                    </Stack>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => remove(statement.id)} disabled={disabled}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <TextField
                    value={statement.text}
                    onChange={(e) => update(statement.id, {
                      text: e.target.value,
                      safety: undefined,
                      implication: undefined,
                    })}
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={disabled}
                    error={
                      Boolean(statement.safety && !statement.safety.allowed)
                      || Boolean(
                        statement.implication
                        && !statement.implication.implies
                        && statement.implication.confidence !== 'low',
                      )
                    }
                    helperText={
                      statement.safety && !statement.safety.allowed
                        ? 'Blocked by safety review'
                        : statement.implication
                          && !statement.implication.implies
                          && statement.implication.confidence !== 'low'
                          ? 'Not clearly implied by the main statement — edit or remove'
                          : undefined
                    }
                  />
                  {statement.implication && !statement.implication.implies && (
                    <Typography variant="caption" color="warning.main">
                      {statement.implication.reasoning}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {rejected.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {rejected.length} suggestion{rejected.length === 1 ? '' : 's'} rejected (hidden from publish).
        </Typography>
      )}
    </Stack>
  )
}
