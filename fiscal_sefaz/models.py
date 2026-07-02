"""Modelos de dados (dataclasses) — resultado da distribuição e do parsing.

São estruturas puras: quem persiste (Appwrite/DB) mapeia estes objetos para as
tabelas fiscais (fiscal_documents, fiscal_invoices, …). O módulo não conhece o
banco — mantém-se testável e reutilizável.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional


class StatusCertificado(str, enum.Enum):
    NAO_CONFIGURADO = "nao_configurado"
    VALIDO = "valido"
    VENCENDO = "vencendo"        # dentro da janela de alerta (ex.: <30 dias)
    VENCIDO = "vencido"
    INVALIDO = "invalido"


class TipoDocumento(str, enum.Enum):
    """Schemas tratados nesta primeira versão + fallback."""

    RES_NFE = "resNFe"                # resumo de NF-e
    PROC_NFE = "procNFe"              # NF-e completa autorizada
    RES_EVENTO = "resEvento"          # resumo de evento
    PROC_EVENTO_NFE = "procEventoNFe"  # evento completo
    DESCONHECIDO = "desconhecido"

    @classmethod
    def identificar(cls, schema_ou_raiz: str) -> "TipoDocumento":
        s = (schema_ou_raiz or "").strip()
        # o atributo @schema vem como "resNFe_v1.01.xsd"; a raiz do XML vem sem sufixo.
        base = s.split("_")[0]
        for tipo in (cls.RES_NFE, cls.PROC_NFE, cls.RES_EVENTO, cls.PROC_EVENTO_NFE):
            if base == tipo.value:
                return tipo
        return cls.DESCONHECIDO


@dataclass
class InfoCertificado:
    """Metadados extraídos do A1 — NUNCA inclui a senha nem o material privado."""

    cnpj: str
    subject_name: str
    issuer: str
    valid_from: datetime
    valid_until: datetime
    status: StatusCertificado
    dias_restantes: int
    validado_em: datetime

    def to_public_dict(self) -> dict:
        """Dict seguro para a API/UI (sem segredos)."""
        return {
            "certificate_cnpj": self.cnpj,
            "subject_name": self.subject_name,
            "issuer": self.issuer,
            "valid_from": self.valid_from.isoformat(),
            "valid_until": self.valid_until.isoformat(),
            "status": self.status.value,
            "dias_restantes": self.dias_restantes,
            "last_validation_at": self.validado_em.isoformat(),
        }


@dataclass
class DocumentoDistribuido:
    """Um docZip já decodificado (base64+gzip) e identificado."""

    nsu: str
    schema: str
    tipo: TipoDocumento
    xml: bytes                       # XML original (bytes, UTF-8)
    xml_hash: str                    # sha256 hex do XML
    xml_size: int
    # Campos extraídos quando disponíveis (resumo — o parsing completo é opcional).
    access_key: Optional[str] = None      # chNFe (44 dígitos)
    cnpj_emitente: Optional[str] = None
    dados: dict = field(default_factory=dict)  # payload extraído (leve)

    def to_public_dict(self) -> dict:
        return {
            "nsu": self.nsu,
            "schema_name": self.schema,
            "document_type": self.tipo.value,
            "access_key": self.access_key,
            "xml_hash": self.xml_hash,
            "xml_size": self.xml_size,
            "cnpj_emitente": self.cnpj_emitente,
            "dados": self.dados,
        }


@dataclass
class ResultadoDistribuicao:
    """Retorno completo de uma chamada NFeDistribuicaoDFe."""

    cstat: int
    motivo: str
    ambiente: int                    # tpAmb
    dh_resp: Optional[str]           # dhResp
    ult_nsu: str                     # ultNSU retornado
    max_nsu: str                     # maxNSU retornado
    documentos: list[DocumentoDistribuido] = field(default_factory=list)
    ha_documentos: bool = False
    sem_novos: bool = False
    consumo_indevido: bool = False
    backoff_recomendado_seg: int = 3600

    @property
    def fim_do_lote(self) -> bool:
        """True quando ultNSU == maxNSU (nada mais a paginar agora)."""
        try:
            return int(self.ult_nsu) >= int(self.max_nsu) and int(self.max_nsu) > 0
        except (TypeError, ValueError):
            return False

    def resumo(self) -> dict:
        return {
            "cstat": self.cstat,
            "motivo": self.motivo,
            "ult_nsu": self.ult_nsu,
            "max_nsu": self.max_nsu,
            "documentos": len(self.documentos),
            "fim_do_lote": self.fim_do_lote,
            "consumo_indevido": self.consumo_indevido,
        }
