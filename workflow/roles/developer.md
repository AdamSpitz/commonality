# Developer documentation

Useful files to read:
  - [Top-level README](/README.md)
  - code-level READMEs in each package (`hardhat/`, `sdk/`, `ui/`, etc.)
  - [specs/tech/subsystems/](/specs/tech/subsystems/) for your subsystem

## LSP (Language Server Protocol)

This project has LSP infrastructure set up for the pi coding agent (`pi-lsp-extension`):
- **TypeScript** — Root `tsconfig.json` with project references for all 17 workspace packages; each sub-package has `"composite": true`
- **Solidity** — `@nomicfoundation/solidity-language-server` configured in `.pi-lsp.json`; `.sol` extension mapping added to `pi-lsp-extension`'s language map
- `.pi-lsp.json` configures both servers and eager TypeScript startup

When adding new workspace packages, add them to the root `tsconfig.json` references array and ensure their tsconfig has `"composite": true`. When a new language needs LSP support, both the language map (`pi-lsp-extension/src/shared/language-map.ts` in the global npm install) and `.pi-lsp.json` may need updating.
