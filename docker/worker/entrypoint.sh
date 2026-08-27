#!/bin/sh
# Runs the worker, which drains the queue its sibling backend holds.
set -e

/app/refuse-outbound-smtp.sh

PRIVATE_NETWORK_PEERS="$REDIS_HOST" /app/refuse-private-network.sh

exec node packages/worker/dist/worker/src/server.js
