#!/bin/sh
# Injects the first nameserver of /etc/resolv.conf into the generated nginx
# config so the /api upstream is resolved at runtime (works both in docker and
# in kubernetes without hardcoding a cluster DNS address).
set -eu

CONF=/etc/nginx/conf.d/default.conf
FALLBACK=10.96.0.10

[ -f "$CONF" ] || exit 0
grep -q '[$]{DNS_SERVER}' "$CONF" || exit 0

DNS_SERVER=$(awk '$1 == "nameserver" { print $2; exit }' /etc/resolv.conf 2>/dev/null || true)
DNS_SERVER=${DNS_SERVER:-$FALLBACK}

escaped=$(printf '%s' "$DNS_SERVER" | sed -e 's/[\\&]/\\&/g')
sed -i "s|[$]{DNS_SERVER}|$escaped|g" "$CONF"

echo "40-resolver-from-resolvconf.sh: using resolver $DNS_SERVER" >&2
