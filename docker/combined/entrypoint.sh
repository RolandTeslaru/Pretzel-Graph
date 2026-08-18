#!/bin/sh
# Runs Redis, the backend and the worker in one container.
set -e

redis-server --save '' --appendonly no --port 6379 --bind 127.0.0.1 &
REDIS=$!

# Redis is local, so wait for it rather than relying on client retries.
until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do
    sleep 0.2
done

node packages/backend/dist/backend/src/main.js &
BACKEND=$!

node packages/worker/dist/worker/src/server.js &
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
