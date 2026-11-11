#!/bin/bash
# Chiama il portale https://uni.marcoranica.com passando da Cloudflare Access con il service token.
# Uso:   scripts/uni-curl.sh /percorso [altre opzioni di curl]
# Le credenziali si leggono da ~/.config/uni-agent/access.env (CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET)
# e non vengono mai stampate. L'indirizzo si risolve con il DNS di Cloudflare (1.1.1.1) per evitare cache locali.
set -eu

FILE="${UNI_ACCESS_ENV:-$HOME/.config/uni-agent/access.env}"
if [ ! -r "$FILE" ]; then
  echo "Credenziali non trovate: $FILE" >&2
  exit 1
fi
set -a
. "$FILE"
set +a

HOST="uni.marcoranica.com"
PERCORSO="${1:-/}"
shift || true
# Con dig si risolve con 1.1.1.1 (niente cache locali); senza dig si usa il DNS di sistema.
RISOLVI=""
if command -v dig >/dev/null 2>&1; then
  IP="$(dig +short "$HOST" @1.1.1.1 | head -1)"
  [ -n "$IP" ] && RISOLVI="--resolve $HOST:443:$IP"
fi

exec curl -s --max-time 30 \
  $RISOLVI \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  "$@" "https://$HOST$PERCORSO"
