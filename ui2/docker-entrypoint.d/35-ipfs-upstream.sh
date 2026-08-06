#!/bin/sh
# Pick an IPFS API upstream that is reachable so publish works when ui2 is on
# the compose network (service "ipfs") or only the host-published port is up.
set -eu

CONF=/etc/nginx/conf.d/default.conf
CANDIDATES="${IPFS_API_UPSTREAM:-} ipfs:5001 host.docker.internal:5001 172.17.0.1:5001"

pick=""
for candidate in $CANDIDATES; do
  [ -n "$candidate" ] || continue
  host="${candidate%%:*}"
  port="${candidate##*:}"
  if [ "$host" = "$port" ]; then
    port=5001
  fi
  # BusyBox wget: Kubo API id endpoint accepts POST; GET may 405 but proves reachability.
  if wget -q -T 1 -O /dev/null --post-data='' "http://${host}:${port}/api/v0/id" 2>/dev/null \
    || wget -q -T 1 -O /dev/null "http://${host}:${port}/api/v0/id" 2>/dev/null \
    || wget -q -T 1 -O /dev/null "http://${host}:${port}/" 2>/dev/null; then
    pick="${host}:${port}"
    break
  fi
done

if [ -z "$pick" ]; then
  pick="ipfs:5001"
  echo "IPFS API not reachable yet; defaulting nginx upstream to $pick"
else
  echo "Using IPFS API upstream $pick"
fi

if grep -q 'set \$ipfs_api_upstream' "$CONF" 2>/dev/null; then
  sed -i "s|set \$ipfs_api_upstream [^;]*;|set \$ipfs_api_upstream ${pick};|" "$CONF"
else
  sed -i "s|server {|server {\n    set \$ipfs_api_upstream ${pick};|" "$CONF"
fi
