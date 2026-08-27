#!/bin/sh
# Drops traffic to the private network range when REFUSE_PRIVATE_NETWORK is set,
# except to the hosts named in PRIVATE_NETWORK_PEERS.
set -e

[ -n "$REFUSE_PRIVATE_NETWORK" ] || exit 0

PRIVATE_RANGE="fdaa::/16"

if ! command -v ip6tables >/dev/null 2>&1; then
    echo "REFUSE_PRIVATE_NETWORK is set but ip6tables is missing; the private network is open" >&2
    exit 0
fi

# Replies to connections this machine opened, which the rules below never see.
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

# The resolver sits in this range, so closing it without this resolves nothing.
for nameserver in $(awk '/^nameserver/ { print $2 }' /etc/resolv.conf 2>/dev/null); do
    case "$nameserver" in
        *:*) ip6tables -A OUTPUT -d "$nameserver" -j ACCEPT 2>/dev/null || true ;;
    esac
done

for peer in $PRIVATE_NETWORK_PEERS; do
    address=$(getent ahostsv6 "$peer" 2>/dev/null | awk 'NR==1 { print $1 }')

    if [ -z "$address" ]; then
        echo "Could not resolve $peer; it will be unreachable" >&2

        continue
    fi

    ip6tables -A OUTPUT -d "$address" -j ACCEPT 2>/dev/null \
        || echo "Could not allow $peer at $address" >&2
done

# Reported rather than fatal: a machine that cannot filter still has to serve.
ip6tables -A OUTPUT -d "$PRIVATE_RANGE" -j REJECT 2>/dev/null \
    || echo "Could not close the private network" >&2
