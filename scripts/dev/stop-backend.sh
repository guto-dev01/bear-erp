#!/usr/bin/env bash
#
# Para os serviços de backend iniciados por run-backend.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PIDS="$ROOT/.backend.pids"

if [ ! -f "$PIDS" ]; then
  echo "Nada para parar (sem $PIDS). Tentando por padrão de processo…"
  pkill -f "spring-boot:run" 2>/dev/null
  pkill -f "bear-erp" 2>/dev/null
  exit 0
fi

while IFS=: read -r pid name; do
  [ -z "${pid:-}" ] && continue
  if kill "$pid" 2>/dev/null; then
    echo "⏹  parado $name (pid $pid)"
  fi
done < "$PIDS"

rm -f "$PIDS"
echo "✅ Backend parado."
