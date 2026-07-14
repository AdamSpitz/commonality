#!/usr/bin/env python3
"""Structural verification of the analysis-results package (shipped deliverable).

Run from anywhere:
  python3 analysis-results/verify_package.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

REQUIRED_FILES = [
    "Report-A-System-Overview.md",
    "Report-B-Technical-Scale-Readiness.md",
    "Report-C-US-Canada-Legal-Risk.md",
    "Report-D-Control-Surface-Operator-Posture.md",
    "Report-E-Launch-Playbook.md",
    "Report-F-Counsel-Vendor-Pack.md",
    "artifacts/risk-register.csv",
    "artifacts/profit-language-inventory.md",
    "artifacts/control-surface-inventory.md",
    "artifacts/securities-posture-matrix.md",
    "BASELINE.txt",
    "README.md",
]

# Report B must cite real repo paths (not only the plan)
B_CITATIONS = [
    "hardhat/contracts",
    "sdk/src",
    "indexer",
    "ui/src",
    "specs/",
    "workflow/",
    "ERC1155SecondaryMarket",
    "ChannelVerifier",
]

# Report C dual jurisdiction + postures + disclaimer + contradictions
C_PATTERNS = [
    r"\bCanada\b",
    r"\b(Howey|Pacific Coast)\b",
    r"(?i)donation-first",
    r"(?i)reimbursement",
    r"(?i)waterfall",
    r"(?i)not legal advice",
    r"(?i)contradiction",
]

# Report E gates + sequence
E_PATTERNS = [
    r"No-Go",
    r"(?i)before mainnet",
    r"(?i)90 days",
]


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.is_file():
            errors.append(f"missing file: {rel}")
        elif path.stat().st_size < 200:
            errors.append(f"file too small: {rel} ({path.stat().st_size} bytes)")

    b = (ROOT / "Report-B-Technical-Scale-Readiness.md").read_text(encoding="utf-8")
    for cite in B_CITATIONS:
        if cite not in b:
            errors.append(f"Report B missing citation/token: {cite}")
    if not re.search(r"(?i)mainnet readiness scorecard|scorecard", b):
        errors.append("Report B missing mainnet readiness scorecard section")

    c = (ROOT / "Report-C-US-Canada-Legal-Risk.md").read_text(encoding="utf-8")
    for pat in C_PATTERNS:
        if not re.search(pat, c):
            errors.append(f"Report C missing pattern: {pat}")

    e = (ROOT / "Report-E-Launch-Playbook.md").read_text(encoding="utf-8")
    for pat in E_PATTERNS:
        if not re.search(pat, e):
            errors.append(f"Report E missing pattern: {pat}")

    reg = (ROOT / "artifacts/risk-register.csv").read_text(encoding="utf-8")
    header = reg.splitlines()[0].lower()
    for col in ("id", "severity", "owner", "mitigation"):
        if col not in header:
            errors.append(f"risk-register.csv missing column: {col}")
    if "R01" not in reg or reg.count("\n") < 10:
        errors.append("risk-register.csv has too few rows")

    # Profit inventory must show real hits (contradiction evidence)
    profit = (ROOT / "artifacts/profit-language-inventory.md").read_text(encoding="utf-8")
    if "make a profit" not in profit and "retroactive-funding.md" not in profit:
        errors.append("profit-language-inventory lacks expected end-user hits")

    # Cross-check: cited contract files exist in this repo (or sibling clone layout)
    repo = None
    for candidate in [ROOT.parent, ROOT.parent.parent, ROOT.parent.parent.parent]:
        if (candidate / "hardhat/contracts").is_dir():
            repo = candidate
            break
    if repo is None:
        sibling = ROOT.parent / "commonality"
        if (sibling / "hardhat/contracts").is_dir():
            repo = sibling
    if repo is None:
        errors.append("could not locate commonality repo root for citation checks")
    else:
        for rel in (
            "hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol",
            "hardhat/contracts/content-funding/ChannelVerifier.sol",
            "docs/end-user/lazyGiving/retroactive-funding.md",
            "specs/product/legal/securities.md",
        ):
            if not (repo / rel).is_file():
                errors.append(f"cited source missing in repo: {rel}")

    if errors:
        print("VERIFY FAIL")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("VERIFY PASS")
    print(f"  package_root={ROOT}")
    print(f"  required_files={len(REQUIRED_FILES)}")
    print(f"  report_b_bytes={len(b.encode())}")
    print(f"  report_c_bytes={len(c.encode())}")
    print(f"  risk_rows={reg.count(chr(10))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
