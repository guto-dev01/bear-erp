"""Carga e validação do certificado digital A1 (ICP-Brasil, e-CNPJ).

- Lê .pfx/.p12 + senha usando `cryptography` (não escreve senha em disco/log).
- Extrai CNPJ (SAN otherName OID 2.16.76.1.3.3 do padrão ICP-Brasil), emissor,
  titular e janela de validade.
- Materializa PEM temporário (0600) para o handshake mTLS do `requests`, e o
  remove ao fim via context manager.

Regras de segurança:
  * a senha só transita em memória;
  * o PEM temporário da chave privada existe apenas durante a requisição e é
    apagado no `finally` (mesmo em erro);
  * nada de senha/chave/segredo em logs.
"""

from __future__ import annotations

import contextlib
import os
import re
import tempfile
from datetime import datetime, timezone
from typing import Iterator, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography import x509

from .errors import CertificadoInvalido, CertificadoVencido, SenhaInvalida, CnpjIncompativel
from .models import InfoCertificado, StatusCertificado

# OID ICP-Brasil que carrega o CNPJ do titular no subjectAltName (otherName).
_OID_CNPJ_ICP = "2.16.76.1.3.3"
# Janela de alerta "vencendo" (dias).
DIAS_ALERTA_VENCIMENTO = 30

_RE_CNPJ = re.compile(rb"\d{14}")
_RE_SO_DIGITOS = re.compile(r"\D+")


def so_digitos(valor: str | None) -> str:
    return _RE_SO_DIGITOS.sub("", valor or "")


class _MaterialCarregado:
    """Wrapper interno com chave privada + certificado + cadeia."""

    def __init__(self, private_key, cert, cadeia):
        self.private_key = private_key
        self.cert = cert
        self.cadeia = cadeia or []


def _carregar_pkcs12(pfx_bytes: bytes, senha: str) -> _MaterialCarregado:
    if not pfx_bytes:
        raise CertificadoInvalido("Arquivo de certificado vazio.")
    senha_bytes = senha.encode("utf-8") if senha else None
    try:
        key, cert, chain = pkcs12.load_key_and_certificates(pfx_bytes, senha_bytes)
    except ValueError as exc:
        # cryptography sinaliza senha errada / arquivo corrompido como ValueError.
        msg = str(exc).lower()
        if "mac" in msg or "invalid password" in msg or "could not deserialize" in msg:
            raise SenhaInvalida() from None
        raise CertificadoInvalido() from None
    if cert is None or key is None:
        raise CertificadoInvalido("PKCS12 sem chave/certificado utilizáveis.")
    return _MaterialCarregado(key, cert, chain)


def _extrair_cnpj(cert: x509.Certificate) -> Optional[str]:
    """CNPJ do titular: primeiro via SAN otherName ICP-Brasil, depois via CN."""
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
        for name in san:
            if isinstance(name, x509.OtherName) and name.type_id.dotted_string == _OID_CNPJ_ICP:
                m = _RE_CNPJ.search(name.value)
                if m:
                    return m.group(0).decode("ascii")
    except x509.ExtensionNotFound:
        pass
    # Fallback: CN costuma ser "RAZAO SOCIAL:CNPJ".
    try:
        cn = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
        m = re.search(r"\d{14}", cn or "")
        if m:
            return m.group(0)
    except (IndexError, AttributeError):
        pass
    return None


def _subject_cn(cert: x509.Certificate) -> str:
    try:
        return cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
    except (IndexError, AttributeError):
        return cert.subject.rfc4514_string()


def _issuer_cn(cert: x509.Certificate) -> str:
    try:
        return cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
    except (IndexError, AttributeError):
        return cert.issuer.rfc4514_string()


def inspecionar(
    pfx_bytes: bytes,
    senha: str,
    *,
    cnpj_empresa: str | None = None,
    agora: datetime | None = None,
) -> InfoCertificado:
    """Valida o A1 e devolve metadados (sem segredos).

    Lança:
      SenhaInvalida, CertificadoInvalido, CertificadoVencido, CnpjIncompativel.
    """
    agora = agora or datetime.now(timezone.utc)
    material = _carregar_pkcs12(pfx_bytes, senha)
    cert = material.cert

    valid_from = cert.not_valid_before_utc
    valid_until = cert.not_valid_after_utc
    cnpj = _extrair_cnpj(cert)
    subject = _subject_cn(cert)
    issuer = _issuer_cn(cert)

    dias_restantes = (valid_until - agora).days

    if agora > valid_until:
        status = StatusCertificado.VENCIDO
    elif agora < valid_from:
        status = StatusCertificado.INVALIDO  # ainda não vigente
    elif dias_restantes <= DIAS_ALERTA_VENCIMENTO:
        status = StatusCertificado.VENCENDO
    else:
        status = StatusCertificado.VALIDO

    info = InfoCertificado(
        cnpj=cnpj or "",
        subject_name=subject,
        issuer=issuer,
        valid_from=valid_from,
        valid_until=valid_until,
        status=status,
        dias_restantes=dias_restantes,
        validado_em=agora,
    )

    # Compatibilidade de CNPJ (quando a empresa foi informada).
    if cnpj_empresa:
        if so_digitos(cnpj_empresa) != so_digitos(cnpj):
            raise CnpjIncompativel(
                f"CNPJ do certificado ({cnpj}) difere do da empresa ({so_digitos(cnpj_empresa)})."
            )

    # Vencido é erro duro para uso em consulta (mas devolvemos info para a UI de
    # cadastro exibir o status; para USAR na SEFAZ, o chamador checa e barra).
    return info


def assegurar_utilizavel(info: InfoCertificado) -> None:
    """Barra o uso do certificado na SEFAZ quando vencido/inválido."""
    if info.status == StatusCertificado.VENCIDO:
        raise CertificadoVencido()
    if info.status == StatusCertificado.INVALIDO:
        raise CertificadoInvalido("Certificado fora do período de validade.")


@contextlib.contextmanager
def material_mtls(pfx_bytes: bytes, senha: str) -> Iterator[tuple[str, str]]:
    """Gera PEM temporário (cert+cadeia, key) para o mTLS do requests.

    Uso:
        with material_mtls(pfx, senha) as (cert_pem, key_pem):
            requests.post(url, data=..., cert=(cert_pem, key_pem))

    Os arquivos têm permissão 0600 e são removidos ao sair do bloco.
    """
    material = _carregar_pkcs12(pfx_bytes, senha)

    cert_pem = material.cert.public_bytes(serialization.Encoding.PEM)
    for extra in material.cadeia:
        cert_pem += extra.public_bytes(serialization.Encoding.PEM)
    key_pem = material.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    cert_path = _tmp_pem(cert_pem, prefix="sefaz_cert_")
    key_path = _tmp_pem(key_pem, prefix="sefaz_key_")
    try:
        yield cert_path, key_path
    finally:
        for p in (cert_path, key_path):
            with contextlib.suppress(FileNotFoundError, OSError):
                os.remove(p)


def _tmp_pem(conteudo: bytes, prefix: str) -> str:
    fd, path = tempfile.mkstemp(prefix=prefix, suffix=".pem")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as fh:
            fh.write(conteudo)
    except Exception:
        with contextlib.suppress(OSError):
            os.remove(path)
        raise
    return path
