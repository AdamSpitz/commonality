#!/usr/bin/env bash
# Exclusive lock for checks that mutate the local Docker stack (wipe, seed,
# restart). Source this file, then call acquire_local_stack_lock.
#
# Held for the rest of the shell's lifetime (fd 200). The lock lives outside
# ./data so stack.fresh-seeded's wipe cannot delete it mid-hold.

acquire_local_stack_lock() {
    local lock="${COMMONALITY_LOCAL_STACK_LOCK:-${TMPDIR:-/tmp}/commonality-local-stack.lock}"
    if ! command -v flock >/dev/null 2>&1; then
        echo "flock is required to serialize local-stack verifier checks." >&2
        return 1
    fi
    mkdir -p "$(dirname "$lock")"
    exec 200>"$lock"
    echo "Acquiring local-stack lock ($lock)..." >&2
    flock 200
    echo "Acquired local-stack lock." >&2
}
