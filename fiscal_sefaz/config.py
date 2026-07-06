"""Configuração de ambientes e endpoints da SEFAZ para NFeDistribuicaoDFe."""

from __future__ import annotations

import enum
from dataclasses import dataclass


class Ambiente(enum.IntEnum):
    """tpAmb da SEFAZ. O valor inteiro é o enviado no XML."""

    PRODUCAO = 1
    HOMOLOGACAO = 2

    @classmethod
    def from_str(cls, valor: str) -> "Ambiente":
        v = (valor or "").strip().lower()
        if v in ("1", "producao", "produção", "prod", "production"):
            return cls.PRODUCAO
        if v in ("2", "homologacao", "homologação", "homolog", "hom"):
            return cls.HOMOLOGACAO
        raise ValueError(f"Ambiente inválido: {valor!r} (use producao|homologacao)")


@dataclass(frozen=True)
class EndpointSefaz:
    url: str
    ambiente: Ambiente
    descricao: str


# Ambiente Nacional (AN) — autorizador nacional do serviço de Distribuição de DF-e.
# É o endpoint padrão do NFeDistribuicaoDFe para a maioria das UFs.
_DISTRIBUICAO_PRODUCAO = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx"
_DISTRIBUICAO_HOMOLOGACAO = "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx"

# Versão do leiaute distDFeInt.
VERSAO_DIST_DFE = "1.35"

# SOAPAction do serviço.
SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"

# Namespaces.
NS_NFE = "http://www.portalfiscal.inf.br/nfe"
NS_WSDL = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"
NS_SOAP12 = "http://www.w3.org/2003/05/soap-envelope"

# NSU inicial (15 dígitos). A primeira sincronização parte de zero.
NSU_INICIAL = "000000000000000"


def endpoint_distribuicao(ambiente: Ambiente) -> EndpointSefaz:
    """Retorna o endpoint AN do NFeDistribuicaoDFe para o ambiente informado."""
    if ambiente == Ambiente.PRODUCAO:
        return EndpointSefaz(_DISTRIBUICAO_PRODUCAO, Ambiente.PRODUCAO, "Ambiente Nacional — Produção")
    return EndpointSefaz(_DISTRIBUICAO_HOMOLOGACAO, Ambiente.HOMOLOGACAO, "Ambiente Nacional — Homologação")


# Mapa UF → código IBGE (cUFAutor). Usado no distDFeInt.
UF_PARA_CODIGO: dict[str, int] = {
    "RO": 11, "AC": 12, "AM": 13, "RR": 14, "PA": 15, "AP": 16, "TO": 17,
    "MA": 21, "PI": 22, "CE": 23, "RN": 24, "PB": 25, "PE": 26, "AL": 27, "SE": 28, "BA": 29,
    "MG": 31, "ES": 32, "RJ": 33, "SP": 35,
    "PR": 41, "SC": 42, "RS": 43,
    "MS": 50, "MT": 51, "GO": 52, "DF": 53,
}


def codigo_uf(uf: str) -> int:
    """UF (sigla) → código IBGE. Lança ValueError se desconhecida."""
    cod = UF_PARA_CODIGO.get((uf or "").strip().upper())
    if cod is None:
        raise ValueError(f"UF não configurada: {uf!r}")
    return cod


def origens_cors(valor: str | None) -> list[str]:
    """Parseia a env CORS_ORIGINS (origens separadas por vírgula) em lista limpa.

    Usada quando o worker roda hospedado (ex.: Render) e o frontend está em outra
    origem além do localhost:4200 de desenvolvimento (este já é liberado por
    regex em api.py). Barra final é removida porque o header Origin nunca a tem.
    """
    if not valor:
        return []
    return [o.strip().rstrip("/") for o in valor.split(",") if o.strip()]
