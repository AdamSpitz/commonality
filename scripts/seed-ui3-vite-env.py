#!/usr/bin/env python3
"""Seed ui3/.env from causestarter/.env or Docker CauseStarter config.json.

Keeps Hardhat/indexer backends shared; ui3 Vite serves on :5175.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ui3" / ".env"
CAUSESTARTER_ENV = ROOT / "causestarter" / ".env"
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
    "VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS",
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
    "VITE_WALLETCONNECT_PROJECT_ID",
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
    if CAUSESTARTER_ENV.exists():
        shutil.copyfile(CAUSESTARTER_ENV, OUT)
        print(f"Copied {CAUSESTARTER_ENV} → {OUT}")
        print("Dev server: http://localhost:5175  (npm run ui3:dev)")
        return 0

    try:
        with urllib.request.urlopen(CONFIG_URL, timeout=5) as resp:
            cfg = json.load(resp)
    except Exception as exc:  # noqa: BLE001
        print(f"No causestarter/.env and failed to fetch {CONFIG_URL}: {exc}", file=sys.stderr)
        print("Copy causestarter/.env to ui3/.env after seeding CauseStarter.", file=sys.stderr)
        return 1

    cfg.pop("VITE_EVENT_CACHE_URL", None)
    wc = read_root_walletconnect()
    if wc:
        cfg.setdefault("VITE_WALLETCONNECT_PROJECT_ID", wc)

    lines = [
        "# Auto-seeded for ui3 local Vite dev (:5175).",
        "# Empty event cache → SPA uses page origin; Vite proxies /api to indexer.",
    ]
    for key in PREFERRED:
        val = cfg.get(key)
        if val:
            lines.append(f"{key}={val}")
    for key, val in sorted(cfg.items()):
        if key.startswith("VITE_") and key not in PREFERRED and val:
            lines.append(f"{key}={val}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT} from {CONFIG_URL}")
    print("Dev server: http://localhost:5175  (npm run ui3:dev)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
