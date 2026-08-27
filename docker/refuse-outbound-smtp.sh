#!/bin/sh
# Drops outbound connections to port 25 when BLOCK_OUTBOUND_SMTP is set.
set -e

[ -n "$BLOCK_OUTBOUND_SMTP" ] || exit 0

if ! command -v iptables >/dev/null 2>&1; then
    echo "BLOCK_OUTBOUND_SMTP is set but iptables is missing; port 25 is open" >&2
    exit 0
fi

# Reported rather than fatal: a machine that cannot filter still has to serve.
iptables  -A OUTPUT -p tcp --dport 25 -j REJECT 2>/dev/null \
    || echo "Could not block outbound port 25 over IPv4" >&2

ip6tables -A OUTPUT -p tcp --dport 25 -j REJECT 2>/dev/null \
    || echo "Could not block outbound port 25 over IPv6" >&2
