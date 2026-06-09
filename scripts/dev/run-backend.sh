#!/usr/bin/env bash
#
# Sobe o backend Bear ERP no terminal (SEM Docker), via `java -jar`.
#
# Uso:
#   scripts/dev/run-backend.sh          # sobe TUDO: gateway (profile local) + todos os microsserviços
#   scripts/dev/run-backend.sh core     # sobe só o essencial: gateway + integracoes-service
#
# Parar:  scripts/dev/stop-backend.sh
# Logs:   logs/backend/<servico>.log  (um por serviço)
#
# Observações:
#  - O gateway usa o profile `local` (rotas estáticas; SEM Redis, SEM Eureka).
#  - Os microsserviços tentam Mongo/Kafka/Eureka e logam retries se não houver
#    infra — eles SOBEM mesmo assim, mas operações de banco/eventos falham até
#    você subir MongoDB/Kafka nativos. As consultas de CPF/CNPJ não usam banco.
#  - Cada JVM é limitada por JAVA_OPTS (padrão -Xmx384m). 30+ serviços = muita RAM;
#    use `core` se a máquina for modesta.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BK="$ROOT/backend"
LOGS="$ROOT/logs/backend"
PIDS="$ROOT/.backend.pids"
MODE="${1:-all}"
JAVA_OPTS="${JAVA_OPTS:--Xmx384m}"

mkdir -p "$LOGS"
: > "$PIDS"

# Token do Hub (do .env, se existir) para o integracoes-service
if [ -f "$ROOT/.env" ]; then
  set -a; # shellcheck disable=SC1090
  CPF_API_TOKEN="$(grep -E '^CPF_API_TOKEN=' "$ROOT/.env" | head -1 | cut -d= -f2-)"; export CPF_API_TOKEN
  set +a
fi
export APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT:-https://cloud.appwrite.io/v1}"
if [ -z "${APPWRITE_PROJECT_ID:-}" ]; then
  echo "⚠  APPWRITE_PROJECT_ID não definido — o gateway não validará o JWT do Appwrite (toda request dará 401)."
  echo "   defina antes:  export APPWRITE_PROJECT_ID=69b52c570036d92459ce"
fi

# Build único (pula testes) se os jars ainda não existem.
# -fae (fail-at-end): 7 serviços legados não compilam (lancamentos, fiscal, relatorios,
# ai-contabil, patrimonio, escritorio, certificado). Compilamos todo o resto e seguimos;
# os que não geraram jar são pulados no runtime.
if ! ls "$BK"/microservices/integracoes-service/target/*-SNAPSHOT.jar >/dev/null 2>&1; then
  echo "▶ Compilando o backend (mvn install -Dmaven.test.skip=true -fae)…"
  ( cd "$BK" && mvn -q install -Dmaven.test.skip=true -fae ) \
    || echo "⚠ Alguns módulos legados não compilaram (esperado) — subindo os que compilaram."
fi

start_jar() {  # <caminho-relativo-ao-backend> [args extra do spring]
  local dir="$1"; shift || true
  local name; name="$(basename "$dir")"
  local jar; jar="$(ls "$BK/$dir"/target/*-SNAPSHOT.jar 2>/dev/null | head -1)"
  if [ -z "$jar" ]; then echo "✗ $name: jar não encontrado (build falhou?)"; return; fi
  echo "▶ subindo $name"
  nohup java $JAVA_OPTS -jar "$jar" "$@" > "$LOGS/$name.log" 2>&1 &
  echo "$!:$name" >> "$PIDS"
}

# 1) Gateway (profile local: sem Redis/Eureka)
start_jar api-gateway --spring.profiles.active=local

# 2) integracoes-service (a feature CPF/CNPJ)
start_jar microservices/integracoes-service

# 3) Demais microsserviços (modo "all")
if [ "$MODE" != "core" ]; then
  for d in "$BK"/microservices/*/; do
    name="$(basename "$d")"
    [ "$name" = "integracoes-service" ] && continue
    start_jar "microservices/$name"
  done
fi

echo ""
echo "✅ Processos iniciados. Logs em: $LOGS/"
echo "   acompanhar um serviço:  tail -f $LOGS/integracoes-service.log"
echo "   acompanhar o gateway:   tail -f $LOGS/api-gateway.log"
echo "   parar tudo:             scripts/dev/stop-backend.sh"
