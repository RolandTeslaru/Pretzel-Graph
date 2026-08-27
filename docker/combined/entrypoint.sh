#!/bin/sh
# Runs Redis, the backend and the worker in one container.
set -e

# The backend and the worker authenticate to each other with this. It never
# leaves the container, so it is generated here when nothing supplies one.
export WORKER_SERVICE_INTERNAL_TOKEN="${WORKER_SERVICE_INTERNAL_TOKEN:-$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")}"

/app/refuse-outbound-smtp.sh

/app/refuse-private-network.sh

redis-server --save '' --appendonly no --port 6379 --bind 127.0.0.1 &
REDIS=$!

# Redis is local, so wait for it rather than relying on client retries.
until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do
    sleep 0.2
done

# With the built output mounted from a checkout, a rebuild on the host should
# be enough — `--watch` restarts the process instead of waiting for a human.
WATCH=""
[ -n "$PRETZEL_DEV_WATCH" ] && WATCH="--watch"

node $WATCH packages/backend/dist/backend/src/main.js &
BACKEND=$!

# The worker runs workflow code, which can read its own environment. These are
# withheld from it: everything else passes through, so a node can still be given
# its own API keys.
env -u DATABASE_URL \
    -u EXECUTION_TOKEN_SIGNING_KEY \
    -u PRETZEL_CLOUD_TOKEN \
    -u TRUSTED_PROXY_TOKEN \
    node $WATCH packages/worker/dist/worker/src/server.js &
WORKER=$!

# Drain on shutdown: the worker closes its queue, the backend its pools.
stop() {
    kill -TERM "$WORKER" "$BACKEND" "$REDIS" 2>/dev/null || true
    wait
    exit 0
}
trap stop TERM INT

# Any process exiting takes the container down, so the platform restarts it.
while kill -0 "$REDIS" 2>/dev/null \
   && kill -0 "$BACKEND" 2>/dev/null \
   && kill -0 "$WORKER" 2>/dev/null; do
    sleep 2
done

kill -TERM "$WORKER" "$BACKEND" "$REDIS" 2>/dev/null || true
exit 1
