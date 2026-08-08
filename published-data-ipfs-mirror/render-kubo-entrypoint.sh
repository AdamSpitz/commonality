#!/bin/sh
set -eu

api_port="${PORT:-10000}"
if [ ! -f /data/ipfs/config ]; then
  ipfs init --profile=server
fi

# This service is reachable only on Render's private network. Do not configure
# browser CORS or publish it as a web service.
ipfs config Addresses.API "/ip4/0.0.0.0/tcp/${api_port}"
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
ipfs config --json API.HTTPHeaders '{}'

exec ipfs daemon --migrate=true
