"""Processamento dos documentos (docZip) retornados pelo NFeDistribuicaoDFe.

Pipeline por documento (conforme especificação):
  1. identificar o NSU;
  2. identificar o schema;
  3. decodificar o Base64;
  4. descompactar o GZip;
  5. validar o XML (parse);
  6. identificar o tipo de documento;
  7. calcular o hash;
  8. (o XML original fica disponível para armazenamento privado);
  9. extrair os dados necessários (resumo leve);
 10/11/12 (vínculo com empresa / duplicidade / registro) ficam na camada de
          persistência — este módulo é puro.

Trata resNFe, procNFe, resEvento e procEventoNFe. A arquitetura permite novos
schemas: basta acrescentar um extrator em `_EXTRATORES`.
"""

from __future__ import annotations

import base64
import gzip
import hashlib
import zlib

from lxml import etree

from .errors import RespostaInvalida
from .models import DocumentoDistribuido, TipoDocumento


def sha256_hex(dados: bytes) -> str:
    return hashlib.sha256(dados).hexdigest()


def decodificar_doczip(conteudo_base64: str) -> bytes:
    """Base64 → GZip → XML (bytes). Lança RespostaInvalida em conteúdo corrompido."""
    try:
        comprimido = base64.b64decode(conteudo_base64, validate=True)
    except (ValueError, TypeError) as exc:
        raise RespostaInvalida(f"Base64 inválido no docZip: {exc}") from None
    try:
        return gzip.decompress(comprimido)
    except (OSError, EOFError, zlib.error) as exc:
        raise RespostaInvalida(f"GZip inválido no docZip: {exc}") from None


def _localname(el) -> str:
    return etree.QName(el).localname if el is not None else ""


def _texto(root, localname: str) -> str | None:
    """Primeiro texto de um elemento por local-name (ignora namespace)."""
    achados = root.xpath(f".//*[local-name()=$n]/text()", n=localname)
    for t in achados:
        s = (t or "").strip()
        if s:
            return s
    return None


def _atributo(root, localname: str, attr: str) -> str | None:
    els = root.xpath(f".//*[local-name()=$n]", n=localname)
    for el in els:
        v = el.get(attr)
        if v:
            return v
    return None


def _chave_de_id(id_valor: str | None) -> str | None:
    if not id_valor:
        return None
    dig = "".join(ch for ch in id_valor if ch.isdigit())
    return dig if len(dig) == 44 else None


# ── Extratores por tipo ────────────────────────────────────────────────────
def _extrair_res_nfe(root) -> dict:
    chave = _texto(root, "chNFe")
    return {
        "access_key": chave,
        "cnpj_emitente": _texto(root, "CNPJ"),
        "dados": {
            "xNome": _texto(root, "xNome"),
            "dhEmi": _texto(root, "dhEmi"),
            "vNF": _texto(root, "vNF"),
            "cSitNFe": _texto(root, "cSitNFe"),
            "dhRecbto": _texto(root, "dhRecbto"),
        },
    }


def _extrair_proc_nfe(root) -> dict:
    chave = _chave_de_id(_atributo(root, "infNFe", "Id")) or _texto(root, "chNFe")
    return {
        "access_key": chave,
        "cnpj_emitente": _primeiro_cnpj_emitente(root),
        "dados": {
            "nNF": _texto(root, "nNF"),
            "serie": _texto(root, "serie"),
            "mod": _texto(root, "mod"),
            "dhEmi": _texto(root, "dhEmi"),
            "natOp": _texto(root, "natOp"),
            "vNF": _texto(root, "vNF"),
            "nProt": _texto(root, "nProt"),
            "dhRecbto": _texto(root, "dhRecbto"),
        },
    }


def _extrair_res_evento(root) -> dict:
    chave = _texto(root, "chNFe")
    return {
        "access_key": chave,
        "cnpj_emitente": _texto(root, "CNPJ"),
        "dados": {
            "tpEvento": _texto(root, "tpEvento"),
            "xEvento": _texto(root, "xEvento"),
            "nSeqEvento": _texto(root, "nSeqEvento"),
            "dhEvento": _texto(root, "dhEvento"),
            "descEvento": _descricao_evento(_texto(root, "tpEvento")),
        },
    }


def _extrair_proc_evento(root) -> dict:
    chave = _texto(root, "chNFe")
    tp = _texto(root, "tpEvento")
    return {
        "access_key": chave,
        "cnpj_emitente": _texto(root, "CNPJ"),
        "dados": {
            "tpEvento": tp,
            "nSeqEvento": _texto(root, "nSeqEvento"),
            "dhEvento": _texto(root, "dhEvento"),
            "nProt": _texto(root, "nProt"),
            "cStat": _texto(root, "cStat"),
            "descEvento": _descricao_evento(tp),
        },
    }


def _primeiro_cnpj_emitente(root) -> str | None:
    """Em procNFe pega o CNPJ dentro de <emit>, evitando o do destinatário."""
    emit = root.xpath(".//*[local-name()='emit']")
    if emit:
        cnpj = emit[0].xpath(".//*[local-name()='CNPJ']/text()")
        if cnpj:
            return cnpj[0].strip()
    return _texto(root, "CNPJ")


def _descricao_evento(tp_evento: str | None) -> str:
    mapa = {
        "110111": "Cancelamento",
        "110110": "Carta de Correção",
        "210200": "Confirmação da Operação",
        "210210": "Ciência da Operação",
        "210220": "Desconhecimento da Operação",
        "210240": "Operação não Realizada",
    }
    return mapa.get((tp_evento or "").strip(), "Evento")


_EXTRATORES = {
    TipoDocumento.RES_NFE: _extrair_res_nfe,
    TipoDocumento.PROC_NFE: _extrair_proc_nfe,
    TipoDocumento.RES_EVENTO: _extrair_res_evento,
    TipoDocumento.PROC_EVENTO_NFE: _extrair_proc_evento,
}


def processar_documento(nsu: str, schema: str, conteudo_base64: str) -> DocumentoDistribuido:
    """Executa o pipeline completo para um docZip e devolve o documento tipado."""
    xml_bytes = decodificar_doczip(conteudo_base64)
    try:
        root = etree.fromstring(xml_bytes)
    except etree.XMLSyntaxError as exc:
        raise RespostaInvalida(f"XML inválido no NSU {nsu}: {exc}") from None

    # Identifica o tipo pelo @schema; se ausente/desconhecido, tenta a raiz.
    tipo = TipoDocumento.identificar(schema)
    if tipo is TipoDocumento.DESCONHECIDO:
        tipo = TipoDocumento.identificar(_localname(root))

    doc = DocumentoDistribuido(
        nsu=str(nsu),
        schema=schema or _localname(root),
        tipo=tipo,
        xml=xml_bytes,
        xml_hash=sha256_hex(xml_bytes),
        xml_size=len(xml_bytes),
    )

    extrator = _EXTRATORES.get(tipo)
    if extrator is not None:
        info = extrator(root)
        doc.access_key = info.get("access_key")
        doc.cnpj_emitente = info.get("cnpj_emitente")
        doc.dados = info.get("dados", {})
    return doc
