from datetime import datetime, timezone

from fiscal_sefaz.models import ResultadoDistribuicao
from fiscal_sefaz.nsu import EstadoNsu, avancar_apos_persistir, manter_sem_avancar

AGORA = datetime(2026, 7, 2, 10, 0, 0, tzinfo=timezone.utc)


def _res(cstat, ult, mx, **kw):
    base = dict(cstat=cstat, motivo="", ambiente=2, dh_resp=None, ult_nsu=ult, max_nsu=mx)
    base.update(kw)
    return ResultadoDistribuicao(**base)


def test_avanca_paginando_quando_ainda_ha_lote():
    estado = EstadoNsu(last_nsu="000000000000000")
    res = _res(138, "000000000000005", "000000000000020", ha_documentos=True, backoff_recomendado_seg=60)
    novo = avancar_apos_persistir(estado, res, agora=AGORA)
    assert novo.last_nsu == "000000000000005"
    assert novo.status == "processando_documentos"
    assert novo.next_sync_at is not None


def test_fim_de_lote_encerra_ciclo():
    estado = EstadoNsu(last_nsu="000000000000010")
    res = _res(138, "000000000000020", "000000000000020", ha_documentos=True, backoff_recomendado_seg=3600)
    novo = avancar_apos_persistir(estado, res, agora=AGORA)
    assert novo.last_nsu == "000000000000020"
    assert novo.status == "concluida"


def test_sem_novos_agenda_proxima():
    estado = EstadoNsu(last_nsu="000000000000020")
    res = _res(137, "000000000000020", "000000000000020", sem_novos=True, backoff_recomendado_seg=3600)
    novo = avancar_apos_persistir(estado, res, agora=AGORA)
    assert novo.status == "concluida"
    assert novo.next_sync_at == AGORA.replace() + __import__("datetime").timedelta(seconds=3600)


def test_consumo_indevido_nao_avanca_nsu():
    estado = EstadoNsu(last_nsu="000000000000007")
    res = _res(656, "000000000000000", "000000000000000", consumo_indevido=True, backoff_recomendado_seg=3600)
    novo = avancar_apos_persistir(estado, res, agora=AGORA)
    assert novo.last_nsu == "000000000000007"  # não retrocedeu nem zerou
    assert novo.status == "bloqueada_temporariamente"


def test_nunca_retrocede():
    estado = EstadoNsu(last_nsu="000000000000050")
    res = _res(138, "000000000000030", "000000000000050", ha_documentos=True)
    novo = avancar_apos_persistir(estado, res, agora=AGORA)
    assert int(novo.last_nsu) == 50  # mantém o maior


def test_manter_sem_avancar_em_falha():
    estado = EstadoNsu(last_nsu="000000000000012")
    novo = manter_sem_avancar(estado, "SEFAZ indisponível", agora=AGORA, backoff_seg=300, codigo=None)
    assert novo.last_nsu == "000000000000012"
    assert novo.status == "falhou"
