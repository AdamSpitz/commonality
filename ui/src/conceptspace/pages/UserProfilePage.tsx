import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
} from '@mui/material'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getUserBeliefs,
  getUserDisbeliefs,
  getUserIndirectSupport,
  type StatementListItem,
  type IndirectSupportInfo,
} from '@commonality/sdk'
import AddIcon from '@mui/icons-material/Add'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export function UserProfilePage() {
  const { address } = useParams<{ address?: string }>()
  const { address: connectedAddress } = useAccount()
  const navigate = useNavigate()

  const displayAddress = address || connectedAddress
  const isOwnProfile = !address || address === connectedAddress

  const [tabValue, setTabValue] = useState(0)
  const [beliefs, setBeliefs] = useState<StatementListItem[]>([])
  const [disbeliefs, setDisbeliefs] = useState<StatementListItem[]>([])
  const [indirectSupport, setIndirectSupport] = useState<IndirectSupportInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  useEffect(() => {
    loadUserData()
  }, [displayAddress])

  const loadUserData = async () => {
    if (!displayAddress) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const machinery = createSDKMachinery(GRAPHQL_URL)

      // Load user's beliefs, disbeliefs, and indirect support in parallel
      const [userBeliefs, userDisbeliefs, userIndirectSupport] = await Promise.all([
        getUserBeliefs(machinery, displayAddress),
        getUserDisbeliefs(machinery, displayAddress),
        getUserIndirectSupport(machinery, displayAddress),
      ])

      setBeliefs(userBeliefs)
      setDisbeliefs(userDisbeliefs)
      setIndirectSupport(userIndirectSupport)
      setLoading(false)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
      setLoading(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleStatementClick = (statementCid: string) => {
    navigate(`/statement/${statementCid}`)
  }

  const renderStatementList = (statements: StatementListItem[]) => {
    if (statements.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No statements found.
        </Typography>
      )
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {statements.map((statement) => (
          <Card key={statement.cid} variant="outlined">
            <CardActionArea onClick={() => handleStatementClick(statement.cid)}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {statement.title || 'Untitled Statement'}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {statement.excerpt || 'No preview available'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${statement.believerCount} believers`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${statement.disbelieverCount} disbelievers`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                  <Chip
                    label={statement.statementType || 'statement'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    )
  }

  const renderIndirectSupport = () => {
    if (indirectSupport.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No indirect support found. Indirect support is calculated via implication relationships.
        </Typography>
      )
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {indirectSupport.map((supportInfo) => {
          const statement = supportInfo.statement
          const supportedVia = supportInfo.supportedVia
          return (
            <Card key={statement.cid} variant="outlined">
              <CardActionArea onClick={() => handleStatementClick(statement.cid)}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {statement.title || 'Untitled Statement'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {statement.excerpt || 'No preview available'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Supported indirectly via {supportedVia.length} statement{supportedVia.length !== 1 ? 's' : ''}:
                    {supportedVia.slice(0, 3).map((via, idx) => (
                      <span key={via.viaStatementCid}>
                        {idx > 0 && ', '}
                        {' '}{via.directlyBelievedStatement?.title || via.viaStatementCid.slice(0, 8)}
                      </span>
                    ))}
                    {supportedVia.length > 3 && '...'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${statement.believerCount} believers`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={statement.statementType || 'statement'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          )
        })}
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!displayAddress) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        <Alert severity="info">Connect your wallet to view your profile.</Alert>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {isOwnProfile ? 'My Profile' : 'User Profile'}
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isOwnProfile ? 'My Profile' : 'User Profile'}
        </Typography>
        {isOwnProfile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/')}
          >
            Create Statement
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {displayAddress}
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="user profile tabs">
          <Tab label={`Beliefs (${beliefs.length})`} />
          <Tab label={`Disbeliefs (${disbeliefs.length})`} />
          <Tab label="Indirect Support" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderStatementList(beliefs)}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderStatementList(disbeliefs)}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {renderIndirectSupport()}
      </TabPanel>
    </Box>
  )
}
