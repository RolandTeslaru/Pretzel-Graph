#!/bin/sh
# Runs Redis and the backend. The worker is a separate machine that reaches this
# Redis over the workspace's private network.
set -e

# Bound to every interface, not loopback: the queue is this machine's to hold and
# its sibling's to consume. The network it sits on is the workspace's own.
# A password is what lets Redis accept its sibling: bound off loopback without
# one, it refuses every non-local client (protected mode).
if [ -n "$REDIS_PASSWORD" ]; then
    redis-server --save '' --appendonly no --port 6379 --bind 0.0.0.0 :: --requirepass "$REDIS_PASSWORD" &
else
    redis-server --save '' --appendonly no --port 6379 --bind 127.0.0.1 &
fi
REDIS=$!

until redis-cli -h 127.0.0.1 ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping >/dev/null 2>&1; do
    sleep 0.2
done

# With the built output mounted from a checkout, a rebuild on the host should
# be enough — `--watch` restarts the process instead of waiting for a human.
WATCH=""
[ -n "$PRETZEL_DEV_WATCH" ] && WATCH="--watch"

node $WATCH packages/backend/dist/backend/src/main.js &
BACKEND=$!

stop() {
    kill -TERM "$BACKEND" "$REDIS" 2>/dev/null || true
    wait
    exit 0
}
trap stop TERM INT

# Either process exiting takes the container down, so the platform restarts it.
while kill -0 "$REDIS" 2>/dev/null && kill -0 "$BACKEND" 2>/dev/null; do
    sleep 2
done

kill -TERM "$BACKEND" "$REDIS" 2>/dev/null || true
exit 1
