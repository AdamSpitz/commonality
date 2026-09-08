# Commonality MCP

Stdio [MCP](https://modelcontextprotocol.io) server for agents that should talk to the protocol instead of scraping CauseStarter.

Reads go through `@commonality/sdk` (event cache + IPFS + folds). Optional HTTP helpers reach **cause-assist** and the **implication attester**. Chain/IPFS writes stay off until `COMMONALITY_MCP_WRITES=1`.

Job map: [`docs/end-user/causestarter/for-llms.md`](../docs/end-user/causestarter/for-llms.md). Generated SDK docs: `sdk/docs/api/` (`npm run build:docs`).

## Run

From the repo root, with the same env as local stack (`.env` after `./scripts/setup-env.sh localhost`):

```bash
npm run mcp --workspace=@commonality/mcp
```

Grok (`~/.grok/config.toml` or `grok mcp add`):

```toml
[mcp_servers.commonality]
command = "npm"
args = ["run", "mcp", "--workspace=@commonality/mcp"]
```

Run the process with cwd = this repository so workspace resolution works.

## Tools

| Tool | Side effect |
| --- | --- |
| `get_statement`, `fetch_ipfs`, `get_implications_*`, `get_user_belief`, `get_user_ref`, `get_project`, `indexer_status` | Read |
| `cause_assist` | HTTP to cause-assist (wording only) |
| `implication_attester_status`, `evaluate_implication` | HTTP; evaluate may 402 (x402) and, if paid, the *attester* publishes on-chain |
| `upload_ipfs`, `believe_statement` | Writes; require `COMMONALITY_MCP_WRITES=1` |

## Env

Same contract/IPFS/indexer names as integration tests (`EVENT_CACHE_URL`, `IPFS_API`, `IPFS_GATEWAY`, `BELIEFS_CONTRACT_ADDRESS`, …). Extra:

| Var | Default |
| --- | --- |
| `CAUSE_ASSIST_URL` | `http://127.0.0.1:3002` |
| `IMPLICATION_ATTESTER_URL` | `http://localhost:3006/implication-attester` |
| `COMMONALITY_MCP_WRITES` | unset (reads only) |
| `MCP_PRIVATE_KEY` or `ETHEREUM_PRIVATE_KEY` | required for `believe_statement` |

Do not log secrets. Stdio is the MCP transport — keep `console.log` off `stdout`.
