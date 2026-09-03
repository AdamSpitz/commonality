#!/bin/sh
# PID 1 for the local Anvil container.
#
# Docker `compose stop` sends SIGTERM. Anvil dumps `--state` on a graceful
# shutdown (SIGINT / clean exit), but as PID 1 it can ignore SIGTERM until
# Docker SIGKILLs it after stop_grace_period — so the next start loads nothing
# and looks like a fresh chain. Forward TERM as INT and *keep waiting* until
# Anvil exits; a single `wait` returns as soon as the trap fires, which used
# to tear the wrapper down before the dump finished.

set -eu

pid=""

forward_int() {
  if [ -n "$pid" ]; then
    kill -INT "$pid" 2>/dev/null || true
  fi
}

trap forward_int INT TERM

anvil "$@" &
pid=$!

# `wait` is interrupted by the trap; loop until the child is actually gone.
while kill -0 "$pid" 2>/dev/null; do
  wait "$pid" || true
done
exit 0
