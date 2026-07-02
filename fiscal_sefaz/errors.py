"""Exceções de domínio e interpretação dos códigos de status (cStat) da SEFAZ.

As mensagens são seguras para exibir ao usuário: nunca contêm senha, conteúdo
de certificado, segredo de criptografia ou stack trace.
"""

from __future__ import annotations

from dataclasses import dataclass


class SefazError(Exception):
    """Raiz de todos os erros do módulo fiscal_sefaz."""

    #: Mensagem amigável (segura para UI).
    mensagem_usuario: str = "Erro na integração com a SEFAZ."

    def __init__(self, detalhe: str | None = None):
        self.detalhe = detalhe
        super().__init__(detalhe or self.mensagem_usuario)


# ── Certificado ────────────────────────────────────────────────────────────
class CertificadoError(SefazError):
    mensagem_usuario = "Problema com o certificado digital."


class SenhaInvalida(CertificadoError):
    mensagem_usuario = "Senha do certificado inválida."


class CertificadoInvalido(CertificadoError):
    mensagem_usuario = "Certificado digital inválido ou corrompido."


class CertificadoVencido(CertificadoError):
    mensagem_usuario = "Certificado digital vencido."


class CnpjIncompativel(CertificadoError):
    mensagem_usuario = "O CNPJ do certificado não corresponde ao CNPJ da empresa."


# ── Comunicação / SEFAZ ────────────────────────────────────────────────────
class SefazIndisponivel(SefazError):
    mensagem_usuario = "SEFAZ indisponível ou sem resposta. Tente novamente mais tarde."


class ErroTLS(SefazError):
    mensagem_usuario = "Falha na conexão segura (TLS/mTLS) com a SEFAZ."


class RespostaInvalida(SefazError):
    mensagem_usuario = "Resposta da SEFAZ em formato inesperado."


class ConsumoIndevido(SefazError):
    """cStat 656 — consumo indevido. Exige backoff antes de nova consulta."""

    mensagem_usuario = (
        "Consumo indevido detectado pela SEFAZ (cStat 656). "
        "Aguarde o intervalo mínimo antes de sincronizar novamente."
    )


class SincronizacaoEmAndamento(SefazError):
    mensagem_usuario = "Já existe uma sincronização em andamento para esta empresa."


class DocumentoDuplicado(SefazError):
    mensagem_usuario = "Documento já importado anteriormente."


# ── Interpretação de cStat ─────────────────────────────────────────────────
@dataclass(frozen=True)
class StatusDistribuicao:
    """Resultado interpretado do cStat do retDistDFeInt."""

    codigo: int
    motivo: str
    ha_documentos: bool          # cStat 138
    sem_novos: bool              # cStat 137
    consumo_indevido: bool       # cStat 656
    rejeitado: bool              # qualquer cStat != 137/138
    backoff_recomendado_seg: int  # intervalo sugerido até a próxima consulta


# cStat comuns do serviço de Distribuição de DF-e.
_CSTAT_SEM_NOVOS = 137        # Nenhum documento localizado
_CSTAT_HA_DOCS = 138          # Documento(s) localizado(s)
_CSTAT_CONSUMO_INDEVIDO = 656  # Consumo Indevido


def interpretar_cstat(codigo: int, motivo: str) -> StatusDistribuicao:
    """Interpreta o cStat do retDistDFeInt em uma estrutura de decisão.

    Regras de backoff (defensivas, evitam consumo indevido):
      - 138 (há docs): pode consultar de novo em seguida para paginar o lote,
        mas o worker deve respeitar um pequeno intervalo (aqui: 60s como piso).
      - 137 (sem novos): finalizar o ciclo; próxima consulta só após intervalo
        longo (1h) — a SEFAZ recomenda não martelar quando não há novidade.
      - 656 (consumo indevido): backoff obrigatório de 1h.
      - demais: tratado como rejeição; backoff conservador de 1h.
    """
    codigo = int(codigo)
    if codigo == _CSTAT_HA_DOCS:
        return StatusDistribuicao(codigo, motivo, True, False, False, False, 60)
    if codigo == _CSTAT_SEM_NOVOS:
        return StatusDistribuicao(codigo, motivo, False, True, False, False, 3600)
    if codigo == _CSTAT_CONSUMO_INDEVIDO:
        return StatusDistribuicao(codigo, motivo, False, False, True, True, 3600)
    # Qualquer outro código é rejeição/erro de negócio.
    return StatusDistribuicao(codigo, motivo, False, False, False, True, 3600)
