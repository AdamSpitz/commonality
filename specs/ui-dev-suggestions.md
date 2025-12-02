# UI Development Suggestions

## Context

The [specs/ui-conceptspace.md](ui-conceptspace.md) spec is quite long (630 lines), and there's a concern about ending up with a big pile of code that isn't quite right and is hard to understand. UI code is inherently fuzzy - it's not exactly right or wrong, just kinda awkward or ugly, or could be organized in many different ways.

This document outlines strategies to make the UI development process smoother and easier to manage.

## Suggestions

### 1. **Extract System-Wide UI Patterns** (New spec file)

Create a new **specs/ui-system.md** that pins down the cross-cutting concerns so you don't have to repeat or re-decide them for each feature:

- **Design tokens** - Exact colors, typography, spacing values (not just "use Material UI defaults")
- **Standard component patterns** - How do we handle loading states? Error states? Transaction pending states? Empty states?
- **Navigation structure** - Global nav, routing patterns, URL schemes
- **Data fetching patterns** - Standard hooks structure, caching rules, error handling
- **Transaction flow patterns** - Standard UX for "connect wallet → approve → sign → wait → success/error"
- **Form patterns** - Validation approach, error display, submission flow

This would be maybe 100-150 lines and would make all the subsequent UI work much more mechanical and predictable.

### 2. **Build in Vertical Slices, Not Horizontal Layers**

Instead of building "all the components, then all the pages, then hook them up," build one **complete end-to-end flow at a time**:

**Phase 1: Minimal Statement Viewing** (Week 1)
- Just viewing statements - no creation, no signing
- Browse page (simple list, basic styling)
- Detail page (just statement content + support numbers)
- Navigation skeleton
- **Goal**: Can click around and see real data from the indexer

**Phase 2: Belief Actions** (Week 1)
- Add believe/disbelieve buttons to statement detail
- Transaction handling
- **Goal**: Can actually sign statements

**Phase 3: Statement Creation** (Week 2)
- Creation form (just basic text initially)
- IPFS upload
- **Goal**: Can create new statements

**Phase 4: User Profiles** (Week 2)
- Basic user page showing signed statements
- **Goal**: Can see what you've signed

This way, at each step you have something working that you can actually use and evaluate. You can course-correct before building the next piece.

### 3. **Start with a Living Style Guide**

Before building actual pages, spend 2-3 hours building a **style guide page** (ui/src/pages/StyleGuide.tsx) that shows:
- All your color tokens in use
- Typography scale
- Standard button states
- Card layouts
- Loading/error states
- Transaction status indicators

This gives you:
- A place to make design decisions **once**
- A reference to copy from when building features
- Easy way to see if things feel cohesive
- Something you can look at and say "yes this feels right" or "no, too cluttered" before investing in features

### 4. **Mock Data First, Then Connect**

For each vertical slice, build with **mock data** first:
```typescript
// First version - hardcoded mock
const mockStatement = {
  id: "abc123",
  content: "Sample statement content",
  directSupporters: 17,
  indirectSupporters: 118
};

// Second version - real data
const { statement } = useStatement(statementId);
```

This lets you:
- Iterate on UI/UX quickly without blockchain complexity
- Get visual feedback immediately
- Make sure the component API makes sense before adding real data

### 5. **Spec-per-Component for Complex Pieces**

For the really tricky/fuzzy pieces (like `StatementRenderer` with references and sanitization), create **focused mini-specs**:

**specs/ui-components/statement-renderer.md** - Just this one component (maybe 50 lines):
- Exact markdown features supported
- How references work (with examples)
- Security requirements
- Edge cases
- Test cases

This way the "fuzzy" parts are isolated and well-defined, and you can review just that spec without re-reading the whole UI spec.

### 6. **Simplify the Initial Scope**

Looking at specs/ui-conceptspace.md, some features could be deferred:

**MVP (must have):**
- View statements (browse + detail)
- Sign/unsign statements
- Create basic text statements
- User profiles showing signed statements

**Phase 2 (defer initially):**
- Implication graph visualization (show the data, but simple list first)
- Statement suggestions algorithm
- Attester configuration
- Social account linking
- Advanced search/filters

**Phase 3 (much later):**
- Real-time updates
- Advanced markdown features
- Reference expansion

This would cut the initial implementation from ~630 lines of spec to maybe ~200 lines you need to think about upfront.

### 7. **Use Storybook or Similar for Component Review**

Instead of "please implement all these components," you could:
1. Ask for component implementation
2. Review in isolation (Storybook or style guide page)
3. Approve or iterate
4. Then compose into pages

This breaks the big pile into reviewable chunks.

### 8. **Concrete Proposal: Refactor the Specs**

Refactor the UI spec into:

**specs/ui-system.md** (~100-150 lines)
- Design system, patterns, standards
- Used by ALL UI work

**specs/ui-mvp.md** (~150-200 lines)
- Just the core flows for initial launch
- Browse, view, sign, create (basic)

**specs/ui-advanced.md** (~200+ lines)
- Everything else from ui-conceptspace
- Deferred for later

**specs/ui-components/** directory
- Individual component specs for complex pieces
- Each 30-100 lines, focused

Then you could say "implement ui-mvp.md using ui-system.md" and get something small and coherent, rather than a big pile.

### 9. **Incremental Implementation with Checkpoints**

After each vertical slice, you could:
1. Review the actual running UI
2. Identify what feels awkward/ugly
3. Update the patterns in ui-system.md
4. Refactor if needed
5. Then move to next slice

This way the "fuzzy" parts get resolved through iteration, but on small pieces.

## Next Steps

Possible next actions:

**A)** Create the specs/ui-system.md spec (extracting cross-cutting patterns)

**B)** Refactor specs/ui-conceptspace.md into the smaller, focused files described above

**C)** Create a concrete implementation plan for just the MVP vertical slice (with specific component boundaries)

**D)** Something else

## Key Insight

UI is inherently fuzzy, so the solution is to **reduce the fuzzy surface area** by:
1. Pinning down patterns upfront (ui-system.md)
2. Building in small verifiable chunks rather than all at once (vertical slices)
3. Isolating complex/fuzzy pieces into focused specs (ui-components/)
4. Iterating on small pieces before moving to the next

This approach should help avoid ending up with a big pile of code that's hard to understand and isn't quite right.
