import { useState } from 'react'
import { Box, Typography, Paper, Button, Alert } from '@mui/material'
import { useAccount } from 'wagmi'
import { Link, useNavigate } from 'react-router-dom'
import { CreateStatementForm } from '../components'
import type { IpfsCidV1 } from '@commonality/sdk'

export function HomePage() {
  const { address, isConnected } = useAccount()
  const navigate = useNavigate()
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleStatementCreated = (statementCid: IpfsCidV1) => {
    // Hide the form and redirect to the statement page
    setShowCreateForm(false)
    // Navigate to the statement page
    navigate(`/statement/${statementCid}`)
  }

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Commonality
        </Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1" paragraph>
            A coordination platform for aligned people to track their numbers and
            crowdfund projects.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect your wallet to get started. Browse statements, express your
            beliefs, and discover projects aligned with your values.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Welcome Back
        </Typography>
        <Button
          component={Link}
          to={`/user/${address}`}
          variant="outlined"
        >
          View My Profile
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Connected as: {address}
      </Alert>

      {!showCreateForm ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowCreateForm(true)}
            sx={{ mr: 2 }}
          >
            Create and Sign Statement
          </Button>
          <Button
            component={Link}
            to="/statements"
            variant="outlined"
          >
            Browse Statements
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mb: 3 }}>
          <CreateStatementForm onStatementCreated={handleStatementCreated} />
          <Button
            onClick={() => setShowCreateForm(false)}
            sx={{ mt: 2 }}
          >
            Cancel
          </Button>
        </Box>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View your profile to see statements you've signed and created.
        </Typography>
        <Button
          component={Link}
          to={`/user/${address}`}
          variant="text"
          sx={{ mt: 1 }}
        >
          Go to My Profile
        </Button>
      </Paper>
    </Box>
  )
}
