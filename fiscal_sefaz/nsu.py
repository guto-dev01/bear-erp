"""Controle de NSU por empresa (lógica pura, sem banco).

Regras (da especificação):
  * primeira sincronização parte do NSU inicial (zeros);
  * as seguintes usam sempre o último NSU salvo;
  * nunca reiniciar o NSU automaticamente;
  * nunca avançar o NSU antes de o lote ter sido salvo/processado com sucesso;
  * quando ultNSU == maxNSU, encerrar o ciclo e agendar a próxima sync;
  * tratar consumo indevido (656) com backoff, sem avançar o NSU.

A persistência (fiscal_sync_states) mapeia EstadoNsu ↔ tabela. Aqui é só decisão.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

from .config import NSU_INICIAL
from .models import ResultadoDistribuicao


@dataclass(frozen=True)
class EstadoNsu:
    last_nsu: str = NSU_INICIAL
    max_nsu: str = NSU_INICIAL
    next_sync_at: datetime | None = None
    status: str = "aguardando"
    last_status_code: int | None = None
    last_status_message: str = ""


def _agora(agora: datetime | None) -> datetime:
    return agora or datetime.now(timezone.utc)


def avancar_apos_persistir(estado: EstadoNsu, resultado: ResultadoDistribuicao, agora: datetime | None = None) -> EstadoNsu:
    """Novo estado APÓS o lote ter sido persistido com sucesso.

    Só deve ser chamado quando os documentos do `resultado` já foram gravados.
    Avança `last_nsu` para o `ult_nsu` retornado (nunca retrocede).
    """
    agora = _agora(agora)

    # Nunca retroceder: mantém o maior NSU visto.
    novo_last = max(int(estado.last_nsu or 0), int(resultado.ult_nsu or 0))
    last_nsu = str(novo_last).zfill(15)
    max_nsu = str(max(int(estado.max_nsu or 0), int(resultado.max_nsu or 0))).zfill(15)

    if resultado.consumo_indevido:
        # Não avançou de fato; agenda backoff longo e mantém o NSU.
        return replace(
            estado,
            next_sync_at=agora + timedelta(seconds=resultado.backoff_recomendado_seg),
            status="bloqueada_temporariamente",
            last_status_code=resultado.cstat,
            last_status_message=resultado.motivo,
        )

    if resultado.fim_do_lote or resultado.sem_novos:
        # Nada mais a paginar agora → encerra o ciclo e agenda a próxima.
        return EstadoNsu(
            last_nsu=last_nsu,
            max_nsu=max_nsu,
            next_sync_at=agora + timedelta(seconds=resultado.backoff_recomendado_seg),
            status="concluida",
            last_status_code=resultado.cstat,
            last_status_message=resultado.motivo,
        )

    # Ainda há lote a paginar: mantém o ciclo, próxima chamada quase imediata,
    # respeitando um piso de intervalo para não configurar consumo indevido.
    return EstadoNsu(
        last_nsu=last_nsu,
        max_nsu=max_nsu,
        next_sync_at=agora + timedelta(seconds=max(resultado.backoff_recomendado_seg, 1)),
        status="processando_documentos",
        last_status_code=resultado.cstat,
        last_status_message=resultado.motivo,
    )


def manter_sem_avancar(estado: EstadoNsu, motivo: str, agora: datetime | None = None, backoff_seg: int = 3600, codigo: int | None = None) -> EstadoNsu:
    """Falha antes de persistir (erro de rede/banco/etc.): NÃO avança o NSU."""
    agora = _agora(agora)
    return replace(
        estado,
        next_sync_at=agora + timedelta(seconds=backoff_seg),
        status="falhou",
        last_status_code=codigo,
        last_status_message=motivo,
    )
