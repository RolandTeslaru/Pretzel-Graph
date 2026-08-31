#!/usr/bin/env bash
#
# Builds the deployable images from this checkout into the local docker daemon.
#
#   npm run build:images            every role
#   npm run build:image combined    one role
#
# Images are tagged <name>:latest and <name>:<short sha>.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ROLES="${1:-all}"

[ "$ROLES" = "all" ] && ROLES="combined backend worker"

for role in $ROLES; do
    case "$role" in
        combined|backend|worker) ;;
        *) echo "Unknown role: $role (combined, backend, worker or all)" >&2; exit 1 ;;
    esac
done

SHA=$(git -C "$ROOT" rev-parse --short HEAD)

for role in $ROLES; do
    name="pretzel-graph-$role"

    echo "Building $name from $SHA"

    docker build -f "$ROOT/Dockerfile.$role" -t "$name:latest" -t "$name:$SHA" "$ROOT"
done
