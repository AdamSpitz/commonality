#!/usr/bin/env python3
"""Seed ui/.env and causestarter/.env from Docker CauseStarter config.json.

Requires CauseStarter Docker on http://localhost:8090 (or CAUSESTARTER_CONFIG_URL).
Keeps the compose backends; only the SPA host switches to Vite (:5174).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTS = (ROOT / "ui" / ".env", ROOT / "causestarter" / ".env")
CONFIG_URL = os.environ.get("CAUSESTARTER_CONFIG_URL", "http://localhost:8090/config.json")

PREFERRED = [
    "VITE_IPFS_GATEWAY",
    "VITE_PLATFORM_API_URL",
    "VITE_ETH_RPC_URL",
    "VITE_MAINNET_RPC_URL",
    "VITE_CHAIN_ID",
    "VITE_BELIEFS_CONTRACT_ADDRESS",
    "VITE_IMPLICATIONS_CONTRACT_ADDRESS",
    "VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS",
    "VITE_ERC1155_FACTORY_ADDRESS",
    "VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS",
    "VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS",
    "VITE_NOTE_INTENT_CONTRACT_ADDRESS",
    "VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS",
    "VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS",
    "VITE_TRUST_REGISTRY_CONTRACT_ADDRESS",
    "VITE_DEFAULT_ALIGNMENT_TRUST_ROOT",
    "VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS",
    "VITE_DEFAULT_NUDGERS",
    "VITE_PUBLISHED_DATA_CONTRACT_ADDRESS",
    "VITE_CONTENT_REGISTRY_ADDRESS",
    "VITE_CHANNEL_REGISTRY_ADDRESS",
    "VITE_CHANNEL_ESCROW_ADDRESS",
    "VITE_CREATOR_CONTRACT_FACTORY_ADDRESS",
    "VITE_PROJECT_FACTORY_CONTRACT_ADDRESS",
    "VITE_PAYMENT_TOKEN_ADDRESS",
    "VITE_PAYMENT_TOKEN_SYMBOL",
    "VITE_PAYMENT_TOKEN_DECIMALS",
    "VITE_COMMONALITY_URL",
    "VITE_LAZYGIVING_URL",
    "VITE_ALIGNMENT_URL",
    "VITE_TALLY_URL",
    "VITE_CONTENT_FUNDING_URL",
    "VITE_CIVILITY_URL",
    "VITE_COMMON_SENSE_MAJORITY_URL",
    "VITE_CONCEPTSPACE_URL",
]


def read_root_walletconnect() -> str | None:
    root_env = ROOT / ".env"
    if not root_env.exists():
        return None
    for line in root_env.read_text().splitlines():
        if line.startswith("VITE_WALLETCONNECT_PROJECT_ID="):
            return line.split("=", 1)[1].strip() or None
    return None


def main() -> int:
    try:
        with urllib.request.urlopen(CONFIG_URL, timeout=5) as resp:
            cfg = json.load(resp)
    except Exception as exc:  # noqa: BLE001 — CLI tool, print and exit
        print(f"Failed to fetch {CONFIG_URL}: {exc}", file=sys.stderr)
        print("Start Docker CauseStarter first: ./scripts/deploy-causestarter.sh", file=sys.stderr)
        return 1

    # Empty event cache → SPA uses page origin; Vite proxies /api to indexer.
    cfg.pop("VITE_EVENT_CACHE_URL", None)

    lines = [
        "# Auto-seeded from Docker CauseStarter config.json for local Vite dev.",
        "# Docker stack stays up for hardhat/indexer/IPFS/gateway; use http://localhost:5174",
        f"# Source: {CONFIG_URL}",
        "# Re-run: python3 scripts/seed-causestarter-vite-env.py",
        "",
        f"COMMONALITY_ENVIRONMENT={cfg.get('COMMONALITY_ENVIRONMENT', 'local')}",
    ]
    seen: set[str] = set()
    for key in PREFERRED:
        val = cfg.get(key)
        if val not in (None, ""):
            lines.append(f"{key}={val}")
            seen.add(key)
    for key, val in sorted(cfg.items()):
        if key in seen or key == "COMMONALITY_ENVIRONMENT":
            continue
        if val not in (None, ""):
            lines.append(f"{key}={val}")


    wc = read_root_walletconnect()
    if wc:
        lines.append(f"VITE_WALLETCONNECT_PROJECT_ID={wc}")

    text = "\n".join(lines) + "\n"
    for out in OUTS:
        out.write_text(text)
        print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
