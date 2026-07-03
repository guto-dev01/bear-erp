"""Fábricas de dados sintéticos para os testes (DEV-only, nada real da SEFAZ).

Geram docZip (gzip+base64), respostas SOAP retDistDFeInt e um certificado A1
auto-assinado com o CNPJ embutido no SAN otherName ICP-Brasil (OID 2.16.76.1.3.3).
"""

from __future__ import annotations

import base64
import datetime
import gzip

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID, ObjectIdentifier

_OID_CNPJ = ObjectIdentifier("2.16.76.1.3.3")


# ── XML de exemplo ──────────────────────────────────────────────────────────
def xml_res_nfe(chave="35240712345678000199550010000000011000000017", cnpj="12345678000199", vnf="1500.00") -> str:
    return (
        '<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">'
        f"<chNFe>{chave}</chNFe><CNPJ>{cnpj}</CNPJ><xNome>EMITENTE EXEMPLO LTDA</xNome>"
        "<IE>111111111</IE><dhEmi>2026-07-01T09:00:00-03:00</dhEmi>"
        f"<tpNF>1</tpNF><vNF>{vnf}</vNF><digVal>abc</digVal><dhRecbto>2026-07-01T09:05:00-03:00</dhRecbto>"
        "<cSitNFe>1</cSitNFe></resNFe>"
    )


def xml_proc_nfe(chave="35240712345678000199550010000000021000000025", cnpj="12345678000199", nnf="2", vnf="2500.00") -> str:
    return (
        '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
        f'<NFe><infNFe Id="NFe{chave}" versao="4.00">'
        f"<ide><cUF>35</cUF><natOp>VENDA</natOp><mod>55</mod><serie>1</serie><nNF>{nnf}</nNF>"
        "<dhEmi>2026-07-01T10:00:00-03:00</dhEmi><tpNF>1</tpNF></ide>"
        f"<emit><CNPJ>{cnpj}</CNPJ><xNome>EMITENTE EXEMPLO LTDA</xNome></emit>"
        "<dest><CNPJ>99999999000199</CNPJ><xNome>DESTINATARIO LTDA</xNome></dest>"
        f"<total><ICMSTot><vNF>{vnf}</vNF></ICMSTot></total>"
        "</infNFe></NFe>"
        f'<protNFe><infProt><chNFe>{chave}</chNFe><nProt>135260000000001</nProt><cStat>100</cStat>'
        "<dhRecbto>2026-07-01T10:05:00-03:00</dhRecbto></infProt></protNFe></nfeProc>"
    )


def xml_res_evento(chave="35240712345678000199550010000000021000000025", cnpj="12345678000199", tp="210200") -> str:
    return (
        '<resEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">'
        f"<CNPJ>{cnpj}</CNPJ><chNFe>{chave}</chNFe><dhEvento>2026-07-01T11:00:00-03:00</dhEvento>"
        f"<tpEvento>{tp}</tpEvento><nSeqEvento>1</nSeqEvento><xEvento>Confirmacao da Operacao</xEvento>"
        "<dhRecbto>2026-07-01T11:01:00-03:00</dhRecbto></resEvento>"
    )


def xml_proc_evento(chave="35240712345678000199550010000000021000000025", cnpj="12345678000199", tp="110111") -> str:
    return (
        '<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
        "<evento><infEvento>"
        f"<CNPJ>{cnpj}</CNPJ><chNFe>{chave}</chNFe><dhEvento>2026-07-01T12:00:00-03:00</dhEvento>"
        f"<tpEvento>{tp}</tpEvento><nSeqEvento>1</nSeqEvento></infEvento></evento>"
        f"<retEvento><infEvento><chNFe>{chave}</chNFe><tpEvento>{tp}</tpEvento>"
        "<nProt>135260000000009</nProt><cStat>135</cStat></infEvento></retEvento></procEventoNFe>"
    )


# ── docZip / SOAP ───────────────────────────────────────────────────────────
def doczip(xml: str) -> str:
    return base64.b64encode(gzip.compress(xml.encode("utf-8"))).decode("ascii")


def soap_resposta(cstat=138, motivo="Documento(s) localizado(s)", ult_nsu="000000000000003",
                  max_nsu="000000000000003", docs=None, tp_amb=2) -> str:
    docs = docs or []
    itens = "".join(
        f'<docZip NSU="{nsu}" schema="{schema}">{doczip(xml)}</docZip>' for (nsu, schema, xml) in docs
    )
    lote = f"<loteDistDFeInt>{itens}</loteDistDFeInt>" if itens else ""
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>'
        '<nfeDistDFeInteresseResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">'
        "<nfeDistDFeInteresseResult>"
        '<retDistDFeInt versao="1.35" xmlns="http://www.portalfiscal.inf.br/nfe">'
        f"<tpAmb>{tp_amb}</tpAmb><verAplic>TESTE</verAplic><cStat>{cstat}</cStat><xMotivo>{motivo}</xMotivo>"
        f"<dhResp>2026-07-02T10:00:00-03:00</dhResp><ultNSU>{ult_nsu}</ultNSU><maxNSU>{max_nsu}</maxNSU>"
        f"{lote}</retDistDFeInt>"
        "</nfeDistDFeInteresseResult></nfeDistDFeInteresseResponse></soap:Body></soap:Envelope>"
    )


# ── Certificado A1 sintético ────────────────────────────────────────────────
def make_a1(cnpj="12345678000199", razao="EMPRESA TESTE LTDA", senha="teste123",
           dias_validade=365, inicio: datetime.datetime | None = None) -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    inicio = inicio or (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1))
    fim = inicio + datetime.timedelta(days=dias_validade + 1)

    # SAN otherName ICP-Brasil: DER OCTET STRING com os 14 dígitos do CNPJ.
    cnpj_der = b"\x04" + bytes([len(cnpj)]) + cnpj.encode("ascii")
    san = x509.SubjectAlternativeName([x509.OtherName(_OID_CNPJ, cnpj_der)])

    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"{razao}:{cnpj}")])
    issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AC TESTE ICP-Brasil v1")])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(inicio)
        .not_valid_after(fim)
        .add_extension(san, critical=False)
        .sign(key, hashes.SHA256())
    )

    return pkcs12.serialize_key_and_certificates(
        name=b"teste",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(senha.encode("utf-8")),
    )
