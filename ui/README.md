# Commonality UI

Web interface for the Commonality platform - a coordination platform for aligned people to track their numbers and crowdfund projects.

## Notes for AI working on this code

If you modify this code, please make sure "npm run build" (in the ui directory) succeeds when you're done.

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **UI Library:** Material UI (MUI)
- **Blockchain:** viem, wagmi, ConnectKit
- **State Management:** @tanstack/react-query

## Dev stuff you can do

    npm install
    npm run dev
    npm run build

## Code organization

We use the "sdk" code at the root of this Git repo, for user actions and queries. (See sdk/README.md.) The idea is to share code with the integration tests and any other client code we may eventually have. (If you find yourself implementing any significant complexity in the UI code regarding queries or user actions, please make those changes in the UI code instead, and write integration-tests for your changes too.)

This UI code should be structured into four "logical" UI apps (which may eventually be split into separate physical apps): conceptspace, pubstarter, delegation, fundingportal. So let's have src/conceptspace, src/pubstarter, etc. Put shared stuff into src/shared.

 (The code may not yet be structured this way; AI, please just reorganize it in this way if you see that it needs to be done.)


## UI components that have been implemented

Here's a list of what's done (please keep this list concise):
  - Navigation & Layout: AppShell component with responsive navigation bar, mobile drawer menu, wallet connection, footer
  - Routing: React Router setup with routes for main Concept Space pages (home, browse statements, statement detail, user profile, settings)
  - Placeholder pages: HomePage, BrowseStatementsPage, StatementPage, UserProfilePage, SettingsPage
  - Directory structure: Organized into src/shared, src/conceptspace, src/pubstarter, src/delegation, src/fundingportal
