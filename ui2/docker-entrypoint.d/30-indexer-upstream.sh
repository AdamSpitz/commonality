#!/bin/sh
# Pick an indexer upstream that is actually reachable so Discover and live
# tool examples do not 502 when only ui2 is running (or only the host stack is).
set -eu

CONF=/etc/nginx/conf.d/default.conf
CANDIDATES="${INDEXER_UPSTREAM:-} indexer:42069 host.docker.internal:42069 172.17.0.1:42069"

pick=""
for candidate in $CANDIDATES; do
  [ -n "$candidate" ] || continue
  host="${candidate%%:*}"
  port="${candidate##*:}"
  if [ "$host" = "$port" ]; then
    port=42069
  fi
  # BusyBox wget: try a quick TCP-ish probe via HTTP.
  if wget -q -T 1 -O /dev/null "http://${host}:${port}/status" 2>/dev/null \
    || wget -q -T 1 -O /dev/null "http://${host}:${port}/" 2>/dev/null; then
    pick="${host}:${port}"
    break
  fi
done

if [ -z "$pick" ]; then
  # Keep compose service name as the default; DNS may appear later when stack starts.
  pick="indexer:42069"
  echo "Indexer not reachable yet; defaulting nginx upstream to $pick"
else
  echo "Using indexer upstream $pick"
fi

# Replace the set $indexer_upstream line if present.
if grep -q 'set \$indexer_upstream' "$CONF" 2>/dev/null; then
  sed -i "s|set \$indexer_upstream [^;]*;|set \$indexer_upstream ${pick};|" "$CONF"
else
  # Insert near top of server block
  sed -i "s|server {|server {\n    set \$indexer_upstream ${pick};|" "$CONF"
fi
