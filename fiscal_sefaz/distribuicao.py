"""NFeDistribuicaoDFe — a função de consulta oficial (distNSU) à SEFAZ.

Fluxo:
  1. valida o certificado A1 (compatível com o CNPJ da empresa, dentro da validade);
  2. monta o envelope SOAP 1.2 com distDFeInt (tpAmb, cUFAutor, CNPJ, ultNSU);
  3. envia por HTTPS com autenticação mútua (mTLS) usando o A1;
  4. interpreta o retDistDFeInt (cStat, ultNSU, maxNSU, docZip[]);
  5. processa cada docZip (Base64 → GZip → XML → tipo → hash);
  6. devolve ResultadoDistribuicao pronto para o worker persistir e avançar o NSU.

IMPORTANTE (controle de NSU): esta função NÃO avança o NSU sozinha. Ela devolve
`ult_nsu`/`max_nsu`; o worker só grava o novo NSU **depois** de persistir o lote
com sucesso — nunca antes, nunca reinicia automaticamente.
"""

from __future__ import annotations

from typing import Callable, Optional

from lxml import etree

from . import certificado
from .config import (
    Ambiente,
    NS_NFE,
    NS_SOAP12,
    NS_WSDL,
    NSU_INICIAL,
    SOAP_ACTION,
    VERSAO_DIST_DFE,
    codigo_uf,
    endpoint_distribuicao,
)
from .errors import ErroTLS, RespostaInvalida, SefazIndisponivel, interpretar_cstat
from .models import DocumentoDistribuido, ResultadoDistribuicao, TipoDocumento
from .docparser import processar_documento

# transport(url:str, body:bytes) -> str(xml). Injetável para testes.
Transport = Callable[[str, bytes], str]


def _normalizar_nsu(valor: str | int | None) -> str:
    if valor is None:
        return NSU_INICIAL
    dig = "".join(ch for ch in str(valor) if ch.isdigit()) or "0"
    return dig.zfill(15)[-15:]


def montar_envelope(cnpj: str, uf: str, ambiente: Ambiente, ult_nsu: str | int) -> bytes:
    """Monta o envelope SOAP 1.2 do nfeDistDFeInteresse (distNSU)."""
    cnpj_dig = "".join(ch for ch in str(cnpj) if ch.isdigit())
    if len(cnpj_dig) != 14:
        raise ValueError("CNPJ da empresa inválido (esperado 14 dígitos).")

    soap = etree.Element(f"{{{NS_SOAP12}}}Envelope", nsmap={"soap12": NS_SOAP12})
    body = etree.SubElement(soap, f"{{{NS_SOAP12}}}Body")
    interesse = etree.SubElement(body, f"{{{NS_WSDL}}}nfeDistDFeInteresse", nsmap={None: NS_WSDL})
    dados_msg = etree.SubElement(interesse, f"{{{NS_WSDL}}}nfeDadosMsg")

    dist = etree.SubElement(dados_msg, f"{{{NS_NFE}}}distDFeInt", nsmap={None: NS_NFE})
    dist.set("versao", VERSAO_DIST_DFE)
    etree.SubElement(dist, f"{{{NS_NFE}}}tpAmb").text = str(int(ambiente))
    etree.SubElement(dist, f"{{{NS_NFE}}}cUFAutor").text = str(codigo_uf(uf))
    etree.SubElement(dist, f"{{{NS_NFE}}}CNPJ").text = cnpj_dig
    dist_nsu = etree.SubElement(dist, f"{{{NS_NFE}}}distNSU")
    etree.SubElement(dist_nsu, f"{{{NS_NFE}}}ultNSU").text = _normalizar_nsu(ult_nsu)

    return etree.tostring(soap, xml_declaration=True, encoding="utf-8")


def _requests_transport(url: str, body: bytes, *, cert: tuple[str, str], timeout: int) -> str:
    import os
    import requests  # import tardio: só quando há chamada real

    headers = {
        "Content-Type": f'application/soap+xml; charset=utf-8; action="{SOAP_ACTION}"',
        "Accept": "application/soap+xml",
    }
    # Verificação do certificado de SERVIDOR da SEFAZ (ICP-Brasil). Se a trust
    # store padrão não incluir as ACs ICP-Brasil, aponte SEFAZ_CA_BUNDLE para um
    # bundle .pem que as contenha. Default: verificação normal (certifi).
    ca_bundle = os.environ.get("SEFAZ_CA_BUNDLE")
    verify = ca_bundle if ca_bundle else True
    try:
        resp = requests.post(url, data=body, headers=headers, cert=cert, timeout=timeout, verify=verify)
    except requests.exceptions.SSLError as exc:
        raise ErroTLS(str(exc)) from None
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
        raise SefazIndisponivel(str(exc)) from None
    except requests.exceptions.RequestException as exc:
        raise SefazIndisponivel(str(exc)) from None

    if resp.status_code != 200:
        raise SefazIndisponivel(f"HTTP {resp.status_code} da SEFAZ.")
    return resp.text


def _txt(root, localname: str) -> Optional[str]:
    got = root.xpath(f".//*[local-name()=$n]/text()", n=localname)
    for t in got:
        s = (t or "").strip()
        if s:
            return s
    return None


def parsear_resposta(xml_texto: str, ambiente: Ambiente) -> ResultadoDistribuicao:
    """Interpreta o retDistDFeInt (dentro do envelope SOAP) em ResultadoDistribuicao."""
    try:
        root = etree.fromstring(xml_texto.encode("utf-8") if isinstance(xml_texto, str) else xml_texto)
    except etree.XMLSyntaxError as exc:
        raise RespostaInvalida(f"Resposta SOAP ilegível: {exc}") from None

    ret = root.xpath(".//*[local-name()='retDistDFeInt']")
    if not ret:
        # Pode ser um SOAP Fault.
        fault = _txt(root, "Reason") or _txt(root, "faultstring") or _txt(root, "Text")
        raise RespostaInvalida(f"Sem retDistDFeInt na resposta. {('Fault: ' + fault) if fault else ''}".strip())
    ret = ret[0]

    cstat = int(_txt(ret, "cStat") or 0)
    motivo = _txt(ret, "xMotivo") or ""
    dh_resp = _txt(ret, "dhResp")
    ult_nsu = _normalizar_nsu(_txt(ret, "ultNSU"))
    max_nsu = _normalizar_nsu(_txt(ret, "maxNSU"))
    tp_amb = int(_txt(ret, "tpAmb") or int(ambiente))

    status = interpretar_cstat(cstat, motivo)

    documentos: list[DocumentoDistribuido] = []
    for doc_zip in ret.xpath(".//*[local-name()='docZip']"):
        nsu = doc_zip.get("NSU") or ""
        schema = doc_zip.get("schema") or ""
        conteudo = (doc_zip.text or "").strip()
        try:
            documentos.append(processar_documento(nsu, schema, conteudo))
        except RespostaInvalida as exc:
            # Documento problemático não derruba o lote inteiro; registra e segue.
            documentos.append(
                DocumentoDistribuido(
                    nsu=str(nsu),
                    schema=schema,
                    tipo=TipoDocumento.DESCONHECIDO,
                    xml=b"",
                    xml_hash="",
                    xml_size=0,
                    dados={"erro": exc.mensagem_usuario, "detalhe": str(exc)},
                )
            )

    return ResultadoDistribuicao(
        cstat=cstat,
        motivo=motivo,
        ambiente=tp_amb,
        dh_resp=dh_resp,
        ult_nsu=ult_nsu,
        max_nsu=max_nsu,
        documentos=documentos,
        ha_documentos=status.ha_documentos,
        sem_novos=status.sem_novos,
        consumo_indevido=status.consumo_indevido,
        backoff_recomendado_seg=status.backoff_recomendado_seg,
    )


def consultar_distribuicao(
    *,
    cnpj: str,
    uf: str,
    ambiente: Ambiente | str,
    ult_nsu: str | int = NSU_INICIAL,
    pfx_bytes: Optional[bytes] = None,
    senha: Optional[str] = None,
    cnpj_empresa: Optional[str] = None,
    timeout: int = 60,
    transport: Optional[Transport] = None,
    validar_certificado: bool = True,
) -> ResultadoDistribuicao:
    """Consulta o NFeDistribuicaoDFe (distNSU) e devolve o resultado interpretado.

    Args:
      cnpj: CNPJ autor da consulta (14 dígitos) — normalmente o da empresa.
      uf: sigla da UF do autor (cUFAutor).
      ambiente: Ambiente.PRODUCAO/HOMOLOGACAO (ou 'producao'/'homologacao').
      ult_nsu: último NSU já consultado; a 1ª sync usa NSU_INICIAL (zeros).
      pfx_bytes/senha: material do A1 para o mTLS (obrigatórios na chamada real).
      cnpj_empresa: se informado, valida a compatibilidade com o CNPJ do A1.
      transport: injeção para teste; quando None, faz a chamada mTLS real.
      validar_certificado: valida o A1 antes de chamar (recomendado).
    """
    amb = ambiente if isinstance(ambiente, Ambiente) else Ambiente.from_str(str(ambiente))
    endpoint = endpoint_distribuicao(amb)
    body = montar_envelope(cnpj, uf, amb, ult_nsu)

    if transport is not None:
        # Modo injetado (testes / adaptadores): não realiza mTLS real.
        xml_resposta = transport(endpoint.url, body)
        return parsear_resposta(xml_resposta, amb)

    if not pfx_bytes:
        raise ValueError("pfx_bytes/senha são obrigatórios na chamada real (sem transport injetado).")

    if validar_certificado:
        info = certificado.inspecionar(pfx_bytes, senha or "", cnpj_empresa=cnpj_empresa or cnpj)
        certificado.assegurar_utilizavel(info)

    with certificado.material_mtls(pfx_bytes, senha or "") as (cert_pem, key_pem):
        xml_resposta = _requests_transport(endpoint.url, body, cert=(cert_pem, key_pem), timeout=timeout)
    return parsear_resposta(xml_resposta, amb)
