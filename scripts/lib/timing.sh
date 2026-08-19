#!/usr/bin/env bash
# Elapsed-time marks for local deploy/seed scripts. Source this file.
#
#   timing_begin
#   timing_mark stop
#   timing_mark wipe
#   timing_summary

_TIMING_LABELS=()
_TIMING_EPOCHS=()

timing_begin() {
    _TIMING_LABELS=("start")
    _TIMING_EPOCHS=("$(date +%s)")
}

timing_mark() {
    _TIMING_LABELS+=("$1")
    _TIMING_EPOCHS+=("$(date +%s)")
}

timing_elapsed_since() {
    local label="$1"
    local i
    for i in "${!_TIMING_LABELS[@]}"; do
        if [ "${_TIMING_LABELS[$i]}" = "$label" ]; then
            echo $(( $(date +%s) - ${_TIMING_EPOCHS[$i]} ))
            return 0
        fi
    done
    echo 0
}

timing_fmt() {
    local secs="$1"
    printf "%dm%02ds" $((secs / 60)) $((secs % 60))
}

timing_summary() {
    timing_mark "end"
    echo ""
    echo "=== Timing summary ==="
    local i prev label dt
    prev="${_TIMING_EPOCHS[0]}"
    for ((i = 1; i < ${#_TIMING_LABELS[@]}; i++)); do
        label="${_TIMING_LABELS[$i]}"
        [ "$label" = "end" ] && continue
        dt=$(( ${_TIMING_EPOCHS[$i]} - prev ))
        printf "  %-36s %s (%ds)\n" "$label" "$(timing_fmt "$dt")" "$dt"
        prev="${_TIMING_EPOCHS[$i]}"
    done
    local total=$(( $(date +%s) - ${_TIMING_EPOCHS[0]} ))
    printf "  %-36s %s (%ds)\n" "TOTAL" "$(timing_fmt "$total")" "$total"
}
