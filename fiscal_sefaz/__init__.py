"""
fiscal_sefaz — Integração oficial com a SEFAZ (NFeDistribuicaoDFe).

Módulo Python ISOLADO do frontend Angular (bear2). Roda como worker/serviço
separado — o frontend nunca executa a consulta SOAP diretamente.

Camadas:
  - config       : ambientes (homologação/produção), endpoints, mapa de UF.
  - errors       : exceções de domínio + interpretação de cStat (137/138/656…).
  - models       : dataclasses de resultado (sem dependência de framework).
  - certificado  : carga/validação do A1 (.pfx/.p12) e material mTLS.
  - distribuicao : a função NFeDistribuicaoDFe (SOAP 1.2 + mTLS + distNSU).
  - docparser    : docZip → base64/gzip → identificação de schema → parsing.

Segurança: senha e conteúdo do certificado NUNCA são logados; PEM temporário
é criado com permissão 0600 e removido ao fim do uso.
"""

from .config import Ambiente, EndpointSefaz, UF_PARA_CODIGO, endpoint_distribuicao
from .errors import (
    SefazError,
    CertificadoError,
    CertificadoInvalido,
    CertificadoVencido,
    SenhaInvalida,
    CnpjIncompativel,
    SefazIndisponivel,
    ConsumoIndevido,
    RespostaInvalida,
    interpretar_cstat,
)
from .models import (
    ResultadoDistribuicao,
    DocumentoDistribuido,
    InfoCertificado,
    StatusCertificado,
    TipoDocumento,
)

__all__ = [
    "Ambiente",
    "EndpointSefaz",
    "UF_PARA_CODIGO",
    "endpoint_distribuicao",
    "SefazError",
    "CertificadoError",
    "CertificadoInvalido",
    "CertificadoVencido",
    "SenhaInvalida",
    "CnpjIncompativel",
    "SefazIndisponivel",
    "ConsumoIndevido",
    "RespostaInvalida",
    "interpretar_cstat",
    "ResultadoDistribuicao",
    "DocumentoDistribuido",
    "InfoCertificado",
    "StatusCertificado",
    "TipoDocumento",
]

__version__ = "0.1.0"
