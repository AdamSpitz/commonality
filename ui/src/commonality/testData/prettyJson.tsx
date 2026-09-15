import { Box, Chip, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { getRuntimeConfigValue } from '../../shared'
import { shortAddress } from '../../shared/wallet/hardhatAccounts'

const HIDDEN_KEYS = new Set(['privateKey', 'abi'])
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
const CID_V1 = /^b[a-z2-7]{20,}$/

export function humanizeKey(key: string): string {
  const spaced = key
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .toLowerCase()
  return spaced.replace(/^\w/, character => character.toUpperCase())
}

export function looksLikeCid(value: unknown): value is string {
  return typeof value === 'string' && (CID_V0.test(value) || CID_V1.test(value))
}

export function isCidField(key: string | undefined, value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (looksLikeCid(value)) return true
  return Boolean(key && /cid$/i.test(key.replaceAll(/[\s_-]/g, '')))
}

export function ipfsGatewayUrl(cid: string): string {
  const gateway = (getRuntimeConfigValue('VITE_IPFS_GATEWAY') || 'https://ipfs.io/ipfs').replace(/\/+$/, '')
  return `${gateway}/${cid}`
}

function CidLink({ cid }: { cid: string }) {
  return (
    <Link href={ipfsGatewayUrl(cid)} target="_blank" rel="noopener noreferrer" title={cid}>
      IPFS
    </Link>
  )
}

export function formatScalar(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value)
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string') {
    if (looksLikeCid(value)) return 'IPFS'
    if (/^0x[0-9a-fA-F]{8,}$/.test(value)) return shortAddress(value)
    const asDate = Date.parse(value)
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(asDate)) return new Date(value).toLocaleString()
    return value
  }
  return String(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function visibleEntries(record: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(record).filter(([key]) => !HIDDEN_KEYS.has(key) && key !== '__proto__')
}

function isScalarish(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return true
  return Array.isArray(value) && value.every(item => item == null || typeof item !== 'object')
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flattened: Record<string, unknown> = {}
  for (const [key, value] of visibleEntries(row)) {
    if (isPlainObject(value)) {
      const nested = visibleEntries(value)
      if (nested.length > 0 && nested.every(([, nestedValue]) => isScalarish(nestedValue))) {
        for (const [nestedKey, nestedValue] of nested) {
          if (nestedKey in flattened && flattened[nestedKey] === nestedValue) continue
          flattened[nestedKey in flattened ? `${key} ${nestedKey}` : nestedKey] = nestedValue
        }
        continue
      }
    }
    flattened[key] = value
  }
  return flattened
}

function dropDuplicateColumns(rows: Array<Record<string, unknown>>, columns: string[]): string[] {
  return columns.filter(column => {
    const suffix = column.includes(' ') ? column.slice(column.indexOf(' ') + 1) : ''
    if (!suffix || !columns.includes(suffix)) return true
    return rows.some(row => formatScalar(row[column]) !== formatScalar(row[suffix]))
  })
}

function isObjectArray(value: unknown): boolean {
  return Array.isArray(value) && value.some(isPlainObject)
}

function objectColumns(rows: Array<Record<string, unknown>>): string[] {
  const keys = new Set<string>()
  for (const row of rows) {
    for (const [key, value] of visibleEntries(row)) {
      if (isPlainObject(value) || (Array.isArray(value) && value.some(item => isPlainObject(item)))) continue
      keys.add(key)
    }
  }
  return [...keys]
}

export function JsonValue({ value, field }: { value: unknown; field?: string }) {
  if (isCidField(field, value)) return <CidLink cid={value} />
  if (value == null || typeof value !== 'object') {
    return <Typography component="span">{formatScalar(value)}</Typography>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Typography color="text.secondary">None</Typography>
    if (value.every(item => item == null || typeof item !== 'object')) {
      return (
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {value.map((item, index) => isCidField(field, item)
            ? <CidLink key={`${index}-${item}`} cid={item} />
            : <Chip key={`${index}-${String(item)}`} size="small" label={formatScalar(item)} />)}
        </Stack>
      )
    }
    const rows = value.filter(isPlainObject).map(flattenRow)
    if (rows.length === 0) return <Typography component="span">{formatScalar(value)}</Typography>
    const columns = dropDuplicateColumns(rows, objectColumns(rows))
    const wrapping = new Set(columns.filter(column => rows.some(row => formatScalar(row[column]).length > 32)))
    return (
      <Table size="small" sx={{ width: '100%' }}>
        <TableHead>
          <TableRow>{columns.map(column => (
            <TableCell key={column} sx={wrapping.has(column) ? { minWidth: 220 } : { whiteSpace: 'nowrap' }}>
              {humanizeKey(column)}
            </TableCell>
          ))}</TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map(column => (
                <TableCell
                  key={column}
                  sx={wrapping.has(column)
                    ? { overflowWrap: 'anywhere', whiteSpace: 'normal', minWidth: 220 }
                    : { whiteSpace: 'nowrap' }}
                >
                  <JsonValue value={row[column]} field={column} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (!isPlainObject(value)) return <Typography component="span">{formatScalar(value)}</Typography>
  return <KeyValueTable record={value} />
}

export function KeyValueTable({ record }: { record: Record<string, unknown> }) {
  const entries = visibleEntries(record)
  if (entries.length === 0) return <Typography color="text.secondary">None recorded.</Typography>
  const compact = entries.filter(([, value]) => !isObjectArray(value))
  const sections = entries.filter(([, value]) => isObjectArray(value))
  return (
    <Stack spacing={2}>
      {compact.length > 0 ? (
        <Table size="small">
          <TableBody>
            {compact.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell sx={{ width: '32%', verticalAlign: 'top', fontWeight: 500 }}>{humanizeKey(key)}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}><JsonValue value={value} field={key} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {sections.map(([key, value]) => (
        <Box key={key}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{humanizeKey(key)}</Typography>
          <JsonValue value={value} />
        </Box>
      ))}
    </Stack>
  )
}

export function actionDetail(action: Record<string, unknown>): unknown {
  const transaction = action.transactionHash ?? action.txHash ?? action.hash
  if (typeof transaction === 'string' && transaction) return transaction
  const skip = new Set(['type', 'action', 'actionType', 'userAddress', 'address', 'user', 'userId', 'transactionHash', 'txHash', 'hash'])
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(action)) {
    if (!skip.has(key)) rest[key] = value
  }
  return Object.keys(rest).length > 0 ? rest : '—'
}
