#!/bin/sh
# Runs the worker, which drains the queue its sibling backend holds.
set -e

/app/refuse-outbound-smtp.sh

exec node packages/worker/dist/worker/src/server.js
