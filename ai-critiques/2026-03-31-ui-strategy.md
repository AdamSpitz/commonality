# AI Critique: UI/UX Strategy and Alternate Design
**Date:** Tuesday, March 31, 2026

## Analysis of Current UI
The existing UI (in `ui/src/`) is a functional but "half-baked" implementation using:
*   **React + Vite:** Modern, fast build tool.
*   **Material UI (MUI):** Standard, accessible component library.
*   **Wagmi/Viem:** For Ethereum interactions.
*   **SDK-First Design:** The UI correctly uses the SDK's "fold" and "query" functions.

**Current Limitations:**
1.  **Tabular/List-Heavy:** The design is mostly lists of statements or projects. It doesn't visualize the "Commonality" (the connections between ideas).
2.  **Flat Support Metrics:** It shows "Supporters" but doesn't intuitively separate direct vs. indirect support.
3.  **Fragmented Experience:** Delegation, LazyGiving, and Concept Space feel like separate apps rather than a unified flow.

---

## Proposed Alternate UI Strategy: "The Commonality Browser"

Instead of a standard "web portal," the alternate UI should feel like a **Discovery Engine**.

### 1. Visualization: The Implication Graph
*   **Idea:** Use a graph visualization (e.g., `react-force-graph` or `cytoscape.js`) to show how statements are linked.
*   **Impact:** Users can see the "clusters" of common ground. Clicking a "Conservative" cluster and a "Progressive" cluster reveals the shared statement they both imply.

### 2. The "Credible Threat" Dashboard
*   **Idea:** A dedicated page for "Standby Assurance Contracts."
*   **Impact:** It should visualize the gap between current pledges and the threshold, with a clear "Days until Defunding" countdown. This turns a static pledge page into a high-stakes coordination tool.

### 3. Unified "My Impact" Profile
*   **Idea:** A dashboard that aggregates:
    *   **Direct Beliefs:** What I've signed.
    *   **Indirect Influence:** What I support via implications.
    *   **Delegated Capital:** Where my money is currently flowing through delegates.
    *   **Retroactive Tokens:** The "Social Recognition" NFTs I hold and their "Proven Impact" score.

### 4. "Dial, Not Switch" UX
*   **Idea:** A slider on the project page that lets you toggle between:
    *   **Direct View:** Only projects explicitly aligned with my statement.
    *   **Commonality View:** Projects aligned with statements that *my* statement implies (broadening the scope).

---

## Technical Design for the Alternate UI

### Tech Stack
*   **Framework:** Next.js (for better SEO on public statements).
*   **Styling:** Tailwind CSS (for a more unique, "non-Material" look and feel).
*   **State Management:** TanStack Query (to handle the asynchronous SDK "folds" efficiently).
*   **Visuals:** Framer Motion for smooth transitions between "Direct" and "Indirect" support views.

### Key Components to Build
1.  **`SupportThermometer`:** A component that shows three layers of a progress bar:
    *   Green: Direct Pledges.
    *   Blue: Indirect Pledges (via implications).
    *   Yellow: Delegated "Standby" funds.
2.  **`ImplicationTree`:** A nested list or radial tree showing the "lineage" of a statement.
3.  **`DelegateCard`:** A component showing a delegate's "Signal-to-Noise" ratio (how often their projects reach the funding threshold).

---

## Strengthening the Ideas
*   **Gamified Discovery:** Reward users for finding "Commonality" (e.g., "You found a project that unites two opposing viewpoints!").
*   **AI-Generated Summaries:** Use the `attester/` AI to generate "Why these groups agree" blurbs for project pages.
*   **Transparent Delegation Chains:** Instead of just saying "Delegated," show the path: `You -> Local Expert -> National NGO -> Concrete Project`.

## Summary
The current UI is a great proof-of-concept for *functional* requirements. The alternate UI should focus on the *emotional and strategic* requirements of the project: making collective action feel powerful, visible, and inevitable.
