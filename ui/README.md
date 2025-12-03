# Commonality UI

Web interface for the Commonality platform - a coordination platform for aligned people to track their numbers and crowdfund projects.

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

We use the "sdk" code at the root of this Git repo, for user actions and queries. The idea is to share code with the integration tests and any other client code we may eventually have. See sdk/README.md.

This UI code should be structured into four "logical" UI apps (which may eventually be split into separate physical apps): conceptspace, pubstarter, delegation, fundingportal. So let's have src/conceptspace, src/pubstarter, etc. Put shared stuff into src/shared.

 (The code may not yet be structured this way; AI, please just reorganize it in this way if you see that it needs to be done.)

