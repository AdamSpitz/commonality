# ui3 — Causes, Goals, Beliefs, Projects, Members

Alternate Commonality UI based on [Issue #116](https://github.com/AdamSpitz/commonality/issues/116).
Same substrate as CauseStarter (`causestarter/`), different conceptual surface.

## Concepts

| Concept | Meaning in this UI |
|---|---|
| **Cause** | Title + one **goal**; one or more **founders** |
| **Goal** | Single statement of the desired change (supporters stand by it when published) |
| **Beliefs** | Founder beliefs that motivate the goal |
| **Timeline** | Ordered **milestones**, each with **measures** for status |
| **Projects** | Work toward the goal/milestones; stand by, volunteer (roles), or fund |
| **Member** | Profile: causes founded, statements, projects, delegation |
| **Aggregate** | Bundle of causes supported together (tranche-style) |

On-chain, the goal and beliefs publish as **statements**. Project funding deep-links to LazyGiving.

## Run

1. Local stack: `./scripts/services.sh --start` (hardhat, indexer, cause-assist, gateway tools).
2. Seed env (copy from CauseStarter or Docker config):

   ```bash
   cp causestarter/.env ui3/.env
   # or: python3 scripts/seed-ui3-vite-env.py
   ```

3. Dev server:

   ```bash
   npm run ui3:dev
   ```

   **http://localhost:5175** — alongside main `ui` (:5173) and CauseStarter (:5174).

## Local wallets + online tools

- On localhost, Connect lists **Hardhat #0–#9** (same as CauseStarter / ui2).
- Tool cards open domain SPAs at `*.localhost:8088` (or configured `VITE_*_URL`s) so you still reach LazyGiving, Content Funding, etc.

## Scripts

```bash
npm run ui3:dev
npm run ui3:build
npm run typecheck --workspace=ui3
npm run test --workspace=ui3
```
