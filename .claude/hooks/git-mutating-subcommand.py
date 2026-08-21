#!/usr/bin/env python3
"""Detect git commit/push/merge as real subcommands in a shell snippet.

Used by block-protected-branch.sh. First non-option token after `git` must be
exactly commit, push, or merge — not merge-base, and not the word "merge" in a
log message or tool description.
"""
from __future__ import annotations

import json
import re
import shlex
import sys

MUTATING = {"commit", "push", "merge"}


def extract_command(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return ""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    if not isinstance(data, dict):
        return ""
    cmd = data.get("command")
    if isinstance(cmd, str) and cmd:
        return cmd
    tool_input = data.get("tool_input")
    if isinstance(tool_input, dict):
        inner = tool_input.get("command")
        if isinstance(inner, str):
            return inner
    return ""


def _statements(cmd: str) -> list[str]:
    return re.split(r"[;\n]|\|\||&&|\|", cmd)


def _first_git_subcommand(argv: list[str]) -> tuple[str | None, bool]:
    i = 0
    while i < len(argv) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", argv[i]):
        i += 1
    if i >= len(argv):
        return None, False
    if not re.search(r"(^|/)git$", argv[i]):
        return None, False
    allow = any(re.match(r"ALLOW_PROTECTED_COMMIT=", a) for a in argv[: i + 1])
    i += 1
    while i < len(argv):
        a = argv[i]
        if a == "--":
            i += 1
            break
        if a in ("-C", "-c"):
            i += 2
            continue
        if a.startswith("-"):
            i += 1
            continue
        return a, allow
    if i < len(argv):
        return argv[i], allow
    return None, allow


def is_mutating_git(cmd: str) -> bool:
    for stmt in _statements(cmd):
        stmt = stmt.strip()
        if not stmt:
            continue
        try:
            argv = shlex.split(stmt)
        except ValueError:
            argv = stmt.split()
        sub, allow = _first_git_subcommand(argv)
        if sub in MUTATING and not allow:
            return True
    return False


def self_test() -> int:
    samples = [
        ("git log --oneline", False),
        ("git merge-base --is-ancestor a b", False),
        ("/usr/bin/git merge-base --is-ancestor a b", False),
        ("git status", False),
        ("git switch -c feature/x", False),
        ("git merge other", True),
        ("git commit -m msg", True),
        ("git push origin HEAD", True),
        ("git -C /tmp merge other", True),
        ("git -C /tmp merge-base a b", False),
        ('git log; echo "merge status"', False),
        ("ALLOW_PROTECTED_COMMIT=1 git commit -m x", False),
    ]
    failed = 0
    for sample, expect in samples:
        got = is_mutating_git(sample)
        if got != expect:
            print(f"FAIL {sample!r}: got {got}, want {expect}", file=sys.stderr)
            failed += 1
    payload = json.dumps({
        "command": "git log --oneline",
        "description": "Inspect serialize branch history and merge status",
    })
    if is_mutating_git(extract_command(payload)):
        print("FAIL json description containing 'merge' blocked git log", file=sys.stderr)
        failed += 1
    if failed:
        return 1
    print(f"{len(samples) + 1} checks passed")
    return 0


def main(argv: list[str]) -> int:
    if argv[1:] == ["--self-test"]:
        return self_test()
    raw = sys.stdin.read()
    cmd = extract_command(raw)
    return 0 if is_mutating_git(cmd) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
