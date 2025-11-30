# Concept Space UI Specification

This document outlines the user interface specifications for the Concept Space subsystem of Commonality. The Concept Space allows users to create immutable statements, express beliefs, and navigate implication relationships between ideas.

## Overview

The Concept Space UI enables users to:
- Browse and discover statements representing ideas/causes
- Express belief, disbelief, or neutrality about statements
- Create new statements with references to existing ones
- View support metrics including direct and indirect supporters
- Configure trusted implication attesters
- Navigate the implication graph to find related concepts

## Page Architecture

### 1. Root Page (/)
**Purpose**: Main landing page showing personalized content for connected users

**Content**:
- If wallet not connected: Welcome message with wallet connection prompt
- If wallet connected: Redirect to user profile page or show personalized dashboard
- Quick stats: Total statements, total supporters, trending statements
- Navigation to browse statements

**Components**:
- `WelcomeBanner` - Hero section for new users
- `StatsOverview` - Platform statistics cards
- `TrendingStatements` - Preview of popular statements
- `NavigationPrompt` - Clear CTAs for main actions

### 2. Statement Browse Page (/statements)
**Purpose**: Discover and explore statements with filtering and search capabilities

**Features**:
- Search bar with text search across statement content and metadata
- Filter by: statement type, date range, minimum supporters
- Sort options: newest, most supporters, trending (support velocity), alphabetically
- Pagination or infinite scroll for large result sets
- Statement cards showing: title, excerpt, support counts, creation date

**Components**:
- `StatementSearchBar` - Search input with filters
- `StatementFilters` - Filter controls (sidebar or dropdown)
- `StatementCard` - Compact statement preview
- `StatementList` - Grid/list of statement cards
- `PaginationControls` - Navigation for large datasets

### 3. Statement Detail Page (/statements/:statementId)
**Purpose**: Full view of a single statement with all interaction options

**Content Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Statement Header (Title, CID, Creation Date)            │
├─────────────────────────────────────────────────────────┤
│ Statement Content (Rendered markdown with references)   │
├─────────────────────────────────────────────────────────┤
│ User Belief Section (Believe/Disbelieve/Clear buttons) │
├─────────────────────────────────────────────────────────┤
│ Support Metrics                                         │
│ • Direct Supporters: 17                                │
│ • Indirect Supporters: 118                             │
│ • Total Support: 135                                   │
├─────────────────────────────────────────────────────────┤
│ Implications Section                                   │
│ • Statements implied by this statement                  │
│ • Statements that imply this statement                  │
├─────────────────────────────────────────────────────────┤
│ Related Statements (suggestions for signing)           │
└─────────────────────────────────────────────────────────┘
```

**Components**:
- `StatementHeader` - Title, metadata, action buttons
- `StatementRenderer` - Markdown content with reference linking
- `BeliefActions` - Interactive belief selection
- `SupportMetrics` - Direct/indirect support display
- `ImplicationsSection` - Related statements via implications
- `StatementSuggestions` - Personalized recommendations

### 4. User Profile Page (/users/:address)
**Purpose**: View a user's statement history and contributions

**Tabs**:
- **Directly Signed**: Statements the user has explicitly signed
- **Indirectly Supporting**: Statements supported via implications
- **Created**: Statements authored by the user
- **Settings** (only for own profile): Attester configuration, social links

**Components**:
- `UserProfileHeader` - Address, ens name, social verification badges
- `StatementTabs` - Tab navigation for different statement views
- `UserStatementList` - Filterable list of user's statements
- `SettingsPanel` - Configuration options (own profile only)

### 5. Statement Creation Page (/create)
**Purpose**: Create new statements with references to existing ones

**Form Fields**:
- Title (optional, extracted from content if not provided)
- Content (markdown editor with character limit: 50k)
- References (add existing statements by ID or search)
- Metadata fields (version, tags, etc.)

**Features**:
- Real-time markdown preview
- Reference picker with search
- Character count and validation
- IPFS upload progress indicator
- Gas estimation for transaction

**Components**:
- `StatementForm` - Main creation form
- `MarkdownEditor` - Rich text with preview
- `ReferencePicker` - Search and select referenced statements
- `FormValidation` - Real-time validation feedback
- `UploadProgress` - IPFS upload status

### 6. Settings Page (/settings)
**Purpose**: Configure user preferences and trusted attesters

**Sections**:
- **Trusted Attesters**: List of accounts for implication attestations
- **Social Accounts**: Link Twitter, etc. for verification
- **Privacy**: Data sharing preferences
- **Notifications**: Email/push notification settings

**Components**:
- `AttesterList` - Manage trusted implication attesters
- `SocialAccountLinks` - OAuth integration for social platforms
- `PrivacySettings` - Data sharing controls
- `NotificationPreferences` - Communication settings

## Core Components Specification

### StatementRenderer Component
**Purpose**: Safely render statement content with references and links

**Props**:
```typescript
interface StatementRendererProps {
  statement: {
    content: string;
    references: Array<{
      statementId: string;
      label?: string;
      relationship?: string;
    }>;
  };
  maxDepth?: number; // Prevent infinite reference expansion
  onReferenceClick?: (statementId: string) => void;
}
```

**Features**:
- Markdown rendering using `react-markdown` with `rehype-sanitize`
- Reference placeholder replacement (`{ref:0}` → clickable statement link)
- Circular reference detection (limit expansion depth to 3-5 levels)
- Fallback handling for unreachable IPFS content
- Responsive typography with Material UI theming

**Security**:
- Strict markdown sanitization (no HTML, limited markdown features)
- XSS prevention via content security policies
- IPFS CID validation
- Content length limits

### BeliefActions Component
**Purpose**: Allow users to express belief states about statements

**Props**:
```typescript
interface BeliefActionsProps {
  statementId: string;
  currentBelief?: 'believes' | 'disbelieves' | 'noOpinion';
  userAddress?: string;
  onBeliefChange?: (newBelief: 'believes' | 'disbelieves' | 'noOpinion') => void;
}
```

**States**:
- **Believe**: Green button, shows "You believe this"
- **Disbelieve**: Red button, shows "You disbelieve this"  
- **Clear Opinion**: Gray button, shows "No opinion"
- **Loading**: Transaction pending state
- **Error**: Transaction failed state

**Features**:
- Clear visual indication of current belief state
- Transaction status feedback via wagmi
- Gas estimation before transaction
- Confirmation dialogs for belief changes

### SupportMetrics Component
**Purpose**: Display support statistics with transparency about direct vs indirect support

**Props**:
```typescript
interface SupportMetricsProps {
  directSupporters: number;
  indirectSupporters: number;
  totalSupporters: number;
  showBreakdown?: boolean;
}
```

**Display Format**:
```
Total Support: 135
├─ Direct Supporters: 17
└─ Indirect Supporters: 118
   (via 5 implication attestations)
```

**Features**:
- Clear distinction between direct and indirect support
- Tooltip explaining indirect support calculation
- Link to view supporting implication attestations
- Responsive layout for mobile

### ImplicationsSection Component
**Purpose**: Show statements connected via implication attestations

**Props**:
```typescript
interface ImplicationsSectionProps {
  statementId: string;
  impliedStatements: Array<{
    statementId: string;
    attester: string;
    confidence?: number;
  }>;
  implyingStatements: Array<{
    statementId: string;
    attester: string;
    confidence?: number;
  }>;
  trustedAttesters: string[];
}
```

**Layout**:
- Two columns: "This statement implies" and "Statements that imply this"
- Each implication shows: statement preview, attester, confidence score
- Filter by trusted attesters
- Click to navigate to referenced statement

### StatementSuggestions Component
**Purpose**: Suggest alternative or related statements for user consideration

**Algorithm**:
1. Find statements implied by user's signed statements
2. Filter to statements with more supporters than current
3. Exclude statements user already has opinion about
4. Rank by support count and recency

**Display**:
- "You signed [Statement X], and [Statement Y] is implied by X and has more support"
- Clear call-to-action buttons
- Dismiss options for each suggestion

## User Workflows

### Statement Discovery Workflow
1. **Entry**: User lands on browse page or search results
2. **Exploration**: Browse statement cards with support metrics
3. **Selection**: Click statement to view full details
4. **Evaluation**: Read content, check support, review implications
5. **Action**: Express belief, follow related statements, or return to browsing

### Statement Creation Workflow
1. **Initiation**: Click "Create Statement" from navigation
2. **Content Creation**: Write markdown content with real-time preview
3. **Reference Management**: Add existing statements as references
4. **Validation**: Review form validation and character limits
5. **Upload**: Submit to IPFS with progress indicator
6. **Blockchain**: Sign transaction to register statement
7. **Confirmation**: View newly created statement page

### Belief Expression Workflow
1. **Discovery**: Find statement through browsing or suggestions
2. **Evaluation**: Read content and assess alignment
3. **Action**: Click believe/disbelieve/clear button
4. **Confirmation**: Transaction confirmation with gas estimate
5. **Feedback**: Success/error state with option to view on explorer
6. **Impact**: Updated support metrics and suggestions

### Attester Configuration Workflow
1. **Access**: Navigate to settings page
2. **Review**: View current trusted attesters list
3. **Modification**: Add/remove attester addresses
4. **Validation**: Verify attester addresses and reputation
5. **Save**: Update configuration with immediate effect

## Technical Implementation Details

### State Management Strategy
```typescript
// Using React Query for server state with existing SDK
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStatement, 
  getUserBelief, 
  believeStatement,
  getImplicationsFrom,
  getIndirectSupporters
} from '@commonality/sdk';

// Custom hook for statement data
function useStatement(statementId: string, userAddress?: string) {
  const statementQuery = useQuery({
    queryKey: ['statement', statementId],
    queryFn: () => getStatement(graphqlClient, statementId),
  });

  const userBeliefQuery = useQuery({
    queryKey: ['userBelief', statementId, userAddress],
    queryFn: () => getUserBelief(graphqlClient, userAddress, statementId),
    enabled: !!userAddress,
  });

  const implicationsQuery = useQuery({
    queryKey: ['implications', statementId],
    queryFn: () => getImplicationsFrom(graphqlClient, statementId),
  });

  return {
    statement: statementQuery.data,
    userBelief: userBeliefQuery.data,
    implications: implicationsQuery.data,
    isLoading: statementQuery.isLoading || userBeliefQuery.isLoading,
    error: statementQuery.error || userBeliefQuery.error,
  };
}
```

### Transaction Handling Pattern
```typescript
function useBeliefAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      statementId, 
      action, 
      signer 
    }: { 
      statementId: string; 
      action: 'believes' | 'disbelieves' | 'noOpinion';
      signer: any; 
    }) => {
      switch (action) {
        case 'believes':
          return believeStatement(signer, beliefsContract, statementId);
        case 'disbelieves':
          return disbelieveStatement(signer, beliefsContract, statementId);
        case 'noOpinion':
          return clearOpinion(signer, beliefsContract, statementId);
      }
    },
    onSuccess: () => {
      // Invalidate related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['userBelief'] });
      queryClient.invalidateQueries({ queryKey: ['statement'] });
      queryClient.invalidateQueries({ queryKey: ['indirectSupporters'] });
    },
    onError: (error) => {
      // Handle transaction errors gracefully
      console.error('Belief action failed:', error);
    },
  });
}
```

### Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── TransactionStatus.tsx
│   │   └── Navigation.tsx
│   ├── conceptspace/
│   │   ├── StatementRenderer.tsx
│   │   ├── BeliefActions.tsx
│   │   ├── SupportMetrics.tsx
│   │   ├── ImplicationsSection.tsx
│   │   ├── StatementSuggestions.tsx
│   │   ├── StatementCard.tsx
│   │   ├── StatementSearchBar.tsx
│   │   └── StatementForm.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── StatementBrowsePage.tsx
│   ├── StatementDetailPage.tsx
│   ├── UserProfilePage.tsx
│   ├── StatementCreatePage.tsx
│   └── SettingsPage.tsx
├── hooks/
│   ├── useStatement.ts
│   ├── useBeliefAction.ts
│   ├── useStatementSearch.ts
│   └── useUserBeliefs.ts
├── utils/
│   ├── statementValidation.ts
│   ├── ipfsHelpers.ts
│   ├── formatters.ts
│   └── constants.ts
└── types/
    ├── statement.ts
    ├── belief.ts
    ├── implication.ts
    └── user.ts
```

### Error Handling Strategy

#### IPFS Content Errors
- **Content Unavailable**: Show warning banner, still display support metrics
- **Invalid JSON**: Display error message, fallback to raw CID display
- **Large Content**: Show truncation warning with option to view full content

#### Network/Transaction Errors
- **Wallet Disconnected**: Clear user state, show reconnection prompt
- **Transaction Failed**: Clear error message with retry option
- **Gas Estimation Failed**: Show estimate error, allow manual gas setting

#### Data Loading Errors
- **GraphQL Errors**: Retry mechanism with exponential backoff
- **Rate Limiting**: Queue requests with user feedback
- **Connection Issues**: Offline mode with cached data

### Performance Considerations

#### Pagination Strategy
```typescript
// Cursor-based pagination for large datasets
interface StatementPagination {
  first?: number;
  after?: string;
  orderBy?: 'createdAt' | 'supporters' | 'trending';
  orderDirection?: 'asc' | 'desc';
}

// React Query infinite scroll implementation
function useStatementBrowse(filters: StatementFilters) {
  return useInfiniteQuery({
    queryKey: ['statements', filters],
    queryFn: ({ pageParam }) => 
      browseStatements(graphqlClient, { ...filters, after: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pageInfo.endCursor,
  });
}
```

#### Caching Strategy
- Statement content: Cache for 1 hour (immutable IPFS content)
- Support metrics: Cache for 5 minutes (changes with new beliefs)
- User beliefs: Cache for 1 minute (user's own actions)
- Implications: Cache for 30 minutes (relatively stable)

#### Real-time Updates
- Initial implementation: Polling every 30 seconds for critical data
- Future enhancement: WebSocket subscriptions for real-time updates
- Optimistic updates: Assume success, rollback on transaction failure

### Security & Abuse Prevention

#### Content Security
- **Markdown Sanitization**: Use `rehype-sanitize` with strict schema
- **XSS Prevention**: Content Security Policy headers, DOMPurify
- **Reference Validation**: Validate statement CID format and existence
- **Size Limits**: Enforce 50k character limit on statement content

#### Rate Limiting
- **Statement Creation**: 5 statements per hour per address
- **Belief Changes**: 10 belief changes per hour per address
- **Search Requests**: 60 searches per minute per IP address

#### Spam Detection
- **Content Analysis**: Basic pattern detection for repetitive/spam content
- **Behavior Analysis**: Flag unusual activity patterns
- **User Reporting**: Interface for reporting inappropriate content
- **Moderation Tools**: Admin interface for content review (future)

## Responsive Design Requirements

### Mobile (< 768px)
- Single column layout for statement cards
- Collapsible filters in browse page
- Bottom navigation for key actions
- Touch-friendly button sizes (minimum 44px)
- Simplified statement detail page with tabs

### Tablet (768px - 1024px)
- Two-column layout where appropriate
- Side-by-side filters and results
- Larger touch targets
- Optimized typography for reading

### Desktop (> 1024px)
- Multi-column layouts
- Hover states and micro-interactions
- Keyboard navigation support
- Advanced filtering in sidebar

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: All interactive elements reachable via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators**: Visible focus states for all interactive elements
- **Alternative Text**: Meaningful descriptions for statement content

### Specific Implementation
- **Statement Navigation**: Skip links for content sections
- **Form Validation**: Clear error messages with field association
- **Transaction Status**: Audio feedback for transaction completion
- **Data Tables**: Proper headers and captions for support metrics

## Material UI Theme Customization

### Color Palette
```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue for primary actions
    },
    secondary: {
      main: '#dc004e', // Red for disbelief actions
    },
    success: {
      main: '#2e7d32', // Green for belief actions
    },
    neutral: {
      main: '#757575', // Gray for clear opinion
    },
  },
});
```

### Typography
- **Statement Content**: Roboto, 16px base, 1.6 line height
- **UI Elements**: Material UI default typography scale
- **Code/Monospace**: Roboto Mono for statement IDs and technical content

### Component Customization
- **Statement Cards**: Elevation 2, hover elevation 4
- **Belief Buttons**: Distinct colors with clear states
- **Support Metrics**: Card layout with icon indicators
- **Navigation**: Persistent app bar with clear hierarchy

## Testing Strategy

### Unit Testing
- Component rendering with different props
- Form validation logic
- Statement content parsing and rendering
- Error boundary behavior

### Integration Testing
- Complete user workflows (browse → detail → believe)
- Transaction handling with mock blockchain
- IPFS content loading and error handling
- Search and filtering functionality

### E2E Testing
- Full user journeys from wallet connection to statement interaction
- Cross-browser compatibility testing
- Mobile responsive behavior
- Performance testing with large datasets

### Visual Testing
- Component screenshots for regression testing
- Responsive design verification
- Theme consistency across components
- Accessibility compliance verification

## Launch Readiness Checklist

### Core Functionality
- [ ] Statement browsing with search and filters
- [ ] Statement detail pages with belief actions
- [ ] Statement creation with IPFS upload
- [ ] User profile pages with statement history
- [ ] Settings page for attester configuration

### Technical Requirements
- [ ] Integration with existing SDK and GraphQL APIs
- [ ] Wallet connection and transaction handling
- [ ] Error handling and user feedback
- [ ] Responsive design for mobile/tablet/desktop
- [ ] Accessibility compliance (WCAG 2.1 AA)

### Performance & Scalability
- [ ] Pagination for large statement datasets
- [ ] Efficient caching strategy
- [ ] Loading states and skeleton screens
- [ ] Bundle size optimization
- [ ] Performance testing with realistic data

### Security & Safety
- [ ] Content sanitization and XSS prevention
- [ ] Rate limiting implementation
- [ ] Input validation and sanitization
- [ ] Secure handling of user data
- [ ] Error message sanitization

### User Experience
- [ ] Clear navigation and information architecture
- [ ] Intuitive belief expression workflow
- [ ] Helpful error messages and recovery options
- [ ] Loading states for async operations
- [ ] Transaction status feedback

### Documentation
- [ ] Component documentation and prop types
- [ ] User guide for key workflows
- [ ] Developer setup instructions
- [ ] API integration documentation
- [ ] Deployment and configuration guide

This specification provides a comprehensive foundation for implementing the Concept Space UI while maintaining consistency with the existing Commonality architecture and leveraging the established SDK and infrastructure.
