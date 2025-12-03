# UI System Specification

This document defines the cross-cutting UI patterns, standards, and design decisions used throughout the Commonality application. These patterns should be applied consistently across all features to ensure a cohesive user experience.

## Design System

### Color Palette

**Primary Colors:**
- Primary: `#1976d2` (Material UI blue)
- Secondary: `#dc004e` (Material UI pink)
- Background: `#ffffff` (white)
- Surface: `#f5f5f5` (light gray)

**Semantic Colors:**
- Success: `#2e7d32` (green) - for successful transactions, positive states
- Warning: `#ed6c02` (orange) - for pending states, cautions
- Error: `#d32f2f` (red) - for failed transactions, errors
- Info: `#0288d1` (light blue) - for informational messages

**Text Colors:**
- Primary text: `rgba(0, 0, 0, 0.87)`
- Secondary text: `rgba(0, 0, 0, 0.6)`
- Disabled text: `rgba(0, 0, 0, 0.38)`

### Typography

Use Material UI's default typography scale with these semantic mappings:

- **Page titles:** `variant="h3"` - Large, prominent page headers
- **Section headers:** `variant="h5"` - Section dividers within pages
- **Card titles:** `variant="h6"` - Titles for card components
- **Body text:** `variant="body1"` - Default paragraph text
- **Secondary text:** `variant="body2"` - Less prominent information
- **Captions:** `variant="caption"` - Timestamps, metadata
- **Button text:** `variant="button"` - All-caps button labels

### Spacing

Use Material UI's spacing system (8px base unit):

```typescript
sx={{
  p: 2,    // padding: 16px
  mt: 3,   // margin-top: 24px
  gap: 1,  // gap: 8px
}}
```

**Standard spacing values:**
- Extra small: `0.5` (4px)
- Small: `1` (8px)
- Medium: `2` (16px)
- Large: `3` (24px)
- Extra large: `4` (32px)

### Layout Standards

**Container widths:**
- Default: `maxWidth="lg"` (1280px)
- Narrow content: `maxWidth="md"` (960px)
- Wide content: `maxWidth="xl"` (1920px)

**Card styling:**
```typescript
<Card sx={{ p: 2, mb: 2 }}>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**Page layout pattern:**
```typescript
<Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
  <Typography variant="h3" component="h1" gutterBottom>
    Page Title
  </Typography>
  {/* page content */}
</Container>
```

## Standard Component Patterns

### Loading States

**Full page loading:**
```typescript
<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
  <CircularProgress />
</Box>
```

**Inline loading:**
```typescript
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
  <CircularProgress size={20} />
  <Typography variant="body2">Loading...</Typography>
</Box>
```

**Button loading:**
```typescript
<LoadingButton loading={isLoading} variant="contained">
  Submit
</LoadingButton>
```

**Skeleton screens** (for content placeholders):
```typescript
<Skeleton variant="text" width="60%" />
<Skeleton variant="rectangular" height={200} />
<Skeleton variant="circular" width={40} height={40} />
```

### Error States

**Error alert:**
```typescript
<Alert severity="error" sx={{ mb: 2 }}>
  <AlertTitle>Error</AlertTitle>
  {error.message}
</Alert>
```

**Error with retry:**
```typescript
<Alert
  severity="error"
  action={
    <Button color="inherit" size="small" onClick={retry}>
      Retry
    </Button>
  }
>
  Failed to load data
</Alert>
```

**Inline error (forms):**
```typescript
<TextField
  error={!!errors.fieldName}
  helperText={errors.fieldName?.message}
  {...field}
/>
```

### Empty States

**No data found:**
```typescript
<Box sx={{ textAlign: 'center', py: 8 }}>
  <Typography variant="h6" color="text.secondary" gutterBottom>
    No items found
  </Typography>
  <Typography variant="body2" color="text.secondary">
    Try adjusting your search or filters
  </Typography>
</Box>
```

**Empty with action:**
```typescript
<Box sx={{ textAlign: 'center', py: 8 }}>
  <Typography variant="h6" color="text.secondary" gutterBottom>
    No statements yet
  </Typography>
  <Button variant="contained" sx={{ mt: 2 }} onClick={handleCreate}>
    Create First Statement
  </Button>
</Box>
```

### Transaction States

**Pending transaction:**
```typescript
<Alert severity="warning" icon={<CircularProgress size={20} />}>
  <AlertTitle>Transaction Pending</AlertTitle>
  Waiting for blockchain confirmation...
</Alert>
```

**Successful transaction:**
```typescript
<Alert severity="success">
  <AlertTitle>Transaction Successful</AlertTitle>
  Your transaction has been confirmed.
</Alert>
```

**Failed transaction:**
```typescript
<Alert severity="error">
  <AlertTitle>Transaction Failed</AlertTitle>
  {error.message || 'The transaction was rejected.'}
</Alert>
```

## Navigation Structure

### App Structure

```
/                          - Home (browse statements)
/statements/:id            - Statement detail page
/statements/create         - Create new statement
/users/:address            - User profile page
/users/:address/beliefs    - User's beliefs
/users/:address/projects   - User's projects
/projects                  - Browse projects
/projects/:address         - Project detail page
/projects/create           - Create new project
/causes/:statementId       - Funding portal for a cause
/delegation                - Delegation management
/settings                  - User settings
```

### Navigation Component

**AppBar pattern:**
```typescript
<AppBar position="static">
  <Toolbar>
    <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
      Commonality
    </Typography>
    <Button color="inherit" component={Link} to="/">
      Statements
    </Button>
    <Button color="inherit" component={Link} to="/projects">
      Projects
    </Button>
    <Button color="inherit" component={Link} to="/delegation">
      Delegation
    </Button>
    <ConnectKitButton />
  </Toolbar>
</AppBar>
```

### Breadcrumbs

Use breadcrumbs for deep navigation:
```typescript
<Breadcrumbs sx={{ mb: 2 }}>
  <Link component={RouterLink} to="/">Home</Link>
  <Link component={RouterLink} to="/projects">Projects</Link>
  <Typography color="text.primary">Project Name</Typography>
</Breadcrumbs>
```

## Data Fetching Patterns

### Standard Hook Pattern

```typescript
import { useQuery } from '@tanstack/react-query';
import { getStatement } from '@commonality/sdk';

function useStatement(statementId: string) {
  return useQuery({
    queryKey: ['statement', statementId],
    queryFn: () => getStatement(graphqlExecutor, statementId),
    enabled: !!statementId,
    staleTime: 30000, // 30 seconds
  });
}

// Usage
function StatementPage({ statementId }: { statementId: string }) {
  const { data: statement, isLoading, error } = useStatement(statementId);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!statement) return <NotFoundState />;

  return <StatementView statement={statement} />;
}
```

### Query Key Patterns

**Consistent naming:**
- `['statement', id]` - Single statement
- `['statements']` - List of statements
- `['statements', { filter, sort }]` - Filtered list
- `['userBelief', address, statementId]` - User-specific data
- `['project', address]` - Single project
- `['projects', { aligned: statementId }]` - Filtered projects

### Stale Time Guidelines

- **Static data** (statements, projects): `staleTime: 60000` (1 minute)
- **Dynamic data** (supporter counts, funding): `staleTime: 10000` (10 seconds)
- **User-specific data** (beliefs, balances): `staleTime: 5000` (5 seconds)

### Pagination Pattern

```typescript
function usePaginatedStatements(page: number, pageSize: number = 20) {
  return useQuery({
    queryKey: ['statements', { page, pageSize }],
    queryFn: () => browseStatements(graphqlExecutor, {
      offset: page * pageSize,
      limit: pageSize,
    }),
    keepPreviousData: true,
  });
}
```

## Transaction Flow Patterns

### Standard Transaction Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { believeStatement } from '@commonality/sdk';
import { useWalletClient } from 'wagmi';

function useBelieveStatement() {
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ statementId }: { statementId: string }) => {
      if (!walletClient) throw new Error('No wallet connected');
      return believeStatement(walletClient, beliefsContract, statementId);
    },
    onSuccess: (txHash, { statementId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userBeliefs'] });
      queryClient.invalidateQueries({ queryKey: ['statement', statementId] });
    },
  });
}
```

### Transaction UI Pattern

```typescript
function BelieveButton({ statementId }: { statementId: string }) {
  const { mutate, isLoading, error, isSuccess } = useBelieveStatement();

  return (
    <>
      <LoadingButton
        loading={isLoading}
        variant="contained"
        onClick={() => mutate({ statementId })}
        disabled={isSuccess}
      >
        {isSuccess ? 'Signed!' : 'Sign Statement'}
      </LoadingButton>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error.message}
        </Alert>
      )}
    </>
  );
}
```

### Multi-step Transaction Pattern

For complex flows (e.g., create statement with IPFS upload):

```typescript
function useCreateStatement() {
  const [step, setStep] = useState<'idle' | 'uploading' | 'signing' | 'success'>('idle');
  const [error, setError] = useState<Error | null>(null);

  const create = async (content: string) => {
    try {
      setStep('uploading');
      const cid = await uploadToIpfs(content);

      setStep('signing');
      const txHash = await createStatement(walletClient, cid);

      setStep('success');
      return { cid, txHash };
    } catch (err) {
      setError(err as Error);
      setStep('idle');
      throw err;
    }
  };

  return { create, step, error, isLoading: step !== 'idle' && step !== 'success' };
}

// UI shows current step
{step === 'uploading' && <Alert severity="info">Uploading to IPFS...</Alert>}
{step === 'signing' && <Alert severity="warning">Confirm transaction in wallet...</Alert>}
{step === 'success' && <Alert severity="success">Statement created!</Alert>}
```

## Form Patterns

### Form State Management

Use `react-hook-form` for complex forms:

```typescript
import { useForm } from 'react-hook-form';

interface FormData {
  content: string;
  type: string;
}

function CreateStatementForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();
  const createMutation = useCreateStatement();

  const onSubmit = async (data: FormData) => {
    await createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        label="Statement Content"
        fullWidth
        multiline
        rows={4}
        error={!!errors.content}
        helperText={errors.content?.message}
        {...register('content', {
          required: 'Content is required',
          minLength: { value: 10, message: 'Minimum 10 characters' }
        })}
      />

      <LoadingButton
        type="submit"
        variant="contained"
        loading={isSubmitting}
        sx={{ mt: 2 }}
      >
        Create Statement
      </LoadingButton>
    </form>
  );
}
```

### Simple Form Pattern

For simple forms without validation:

```typescript
function SimpleForm() {
  const [value, setValue] = useState('');
  const mutation = useSomeAction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ value });
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        fullWidth
      />
      <Button type="submit" disabled={!value || mutation.isLoading}>
        Submit
      </Button>
    </form>
  );
}
```

### Validation Patterns

**Required field:**
```typescript
{...register('field', { required: 'This field is required' })}
```

**Minimum length:**
```typescript
{...register('field', {
  minLength: { value: 10, message: 'Minimum 10 characters' }
})}
```

**Pattern matching:**
```typescript
{...register('ethAddress', {
  pattern: {
    value: /^0x[a-fA-F0-9]{40}$/,
    message: 'Invalid Ethereum address'
  }
})}
```

**Custom validation:**
```typescript
{...register('amount', {
  validate: (value) => parseFloat(value) > 0 || 'Amount must be positive'
})}
```

## Wallet Connection Patterns

### Checking Connection

```typescript
import { useAccount } from 'wagmi';

function Component() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  return <AuthenticatedContent address={address} />;
}
```

### Connect Wallet Prompt

```typescript
function ConnectWalletPrompt() {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h6" gutterBottom>
        Connect Your Wallet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You need to connect your wallet to use this feature
      </Typography>
      <ConnectKitButton />
    </Box>
  );
}
```

### Address Display

**Full address with copy:**
```typescript
import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function AddressDisplay({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        {address}
      </Typography>
      <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
        <IconButton size="small" onClick={handleCopy}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
```

**Short address:**
```typescript
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

<Typography variant="body2">{shortenAddress(address)}</Typography>
```

## Common Components

### Stat Display

```typescript
function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {icon}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography variant="h5">
        {value}
      </Typography>
    </Card>
  );
}
```

### List Item Pattern

```typescript
function ItemCard({ title, description, action }: ItemProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          {action}
        </Box>
      </CardContent>
    </Card>
  );
}
```

### Dialog Pattern

```typescript
function ActionDialog({ open, onClose, onConfirm }: DialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to proceed?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## Responsive Design

### Breakpoint Usage

```typescript
// Hide on small screens
<Box sx={{ display: { xs: 'none', md: 'block' } }}>
  Desktop only content
</Box>

// Stack on mobile, row on desktop
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: 2
}}>
  <Box sx={{ flex: 1 }}>Column 1</Box>
  <Box sx={{ flex: 1 }}>Column 2</Box>
</Box>

// Responsive padding
<Container sx={{ px: { xs: 2, md: 4 } }}>
  Content
</Container>
```

### Grid Layout

```typescript
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>
    Column 1
  </Grid>
  <Grid item xs={12} md={6}>
    Column 2
  </Grid>
</Grid>
```

## Accessibility

### ARIA Labels

```typescript
<IconButton aria-label="delete" onClick={handleDelete}>
  <DeleteIcon />
</IconButton>
```

### Focus Management

```typescript
// Auto-focus important inputs
<TextField autoFocus />

// Skip to content
<Link href="#main-content" sx={{ position: 'absolute', left: '-9999px' }}>
  Skip to main content
</Link>
<main id="main-content">
  {/* content */}
</main>
```

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<nav>` for navigation
- Use `<main>` for main content
- Use `<button>` for actions, `<a>` for navigation

## Performance Patterns

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));

function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProjectDetail />
    </Suspense>
  );
}
```

### Memoization

```typescript
import { useMemo } from 'react';

function ExpensiveComponent({ data }: Props) {
  const processedData = useMemo(() => {
    return complexCalculation(data);
  }, [data]);

  return <Display data={processedData} />;
}
```

### Virtual Scrolling

For long lists (100+ items), use virtualization:
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

## Error Boundaries

```typescript
import { Component, ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.error?.message}
          </Typography>
          <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

## Testing Patterns

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('BelieveButton', () => {
  it('calls believeStatement when clicked', async () => {
    const user = userEvent.setup();
    const mockBelieve = jest.fn();

    render(<BelieveButton statementId="123" onBelieve={mockBelieve} />);

    await user.click(screen.getByRole('button', { name: /sign statement/i }));

    expect(mockBelieve).toHaveBeenCalledWith('123');
  });
});
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

describe('useStatement', () => {
  it('fetches statement data', async () => {
    const { result } = renderHook(() => useStatement('123'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```
