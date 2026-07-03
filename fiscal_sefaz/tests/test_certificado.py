import os
from datetime import datetime, timedelta, timezone

import pytest

from fiscal_sefaz import certificado
from fiscal_sefaz.errors import (
    CertificadoVencido,
    CnpjIncompativel,
    SenhaInvalida,
)
from fiscal_sefaz.models import StatusCertificado
from fiscal_sefaz.tests import _fabricas as fab

HOJE = datetime(2026, 7, 2, 12, 0, 0, tzinfo=timezone.utc)


def test_inspecionar_valido_extrai_cnpj_e_validade():
    pfx = fab.make_a1(cnpj="12345678000199", inicio=HOJE - timedelta(days=30), dias_validade=365, senha="teste123")
    info = certificado.inspecionar(pfx, "teste123", cnpj_empresa="12.345.678/0001-99", agora=HOJE)
    assert info.cnpj == "12345678000199"
    assert info.status is StatusCertificado.VALIDO
    assert info.dias_restantes > 300
    assert "EMPRESA TESTE" in info.subject_name
    # dict público não expõe segredo
    pub = info.to_public_dict()
    assert "senha" not in pub and "password" not in pub


def test_certificado_vencendo():
    pfx = fab.make_a1(inicio=HOJE - timedelta(days=5), dias_validade=9, senha="teste123")  # fim ≈ HOJE+5
    info = certificado.inspecionar(pfx, "teste123", agora=HOJE)
    assert info.status is StatusCertificado.VENCENDO
    assert 0 <= info.dias_restantes <= 30


def test_certificado_vencido_barra_uso():
    pfx = fab.make_a1(inicio=HOJE - timedelta(days=400), dias_validade=10, senha="teste123")  # fim no passado
    info = certificado.inspecionar(pfx, "teste123", agora=HOJE)
    assert info.status is StatusCertificado.VENCIDO
    with pytest.raises(CertificadoVencido):
        certificado.assegurar_utilizavel(info)


def test_senha_invalida():
    pfx = fab.make_a1(senha="certa123")
    with pytest.raises(SenhaInvalida):
        certificado.inspecionar(pfx, "errada", agora=HOJE)


def test_cnpj_incompativel():
    pfx = fab.make_a1(cnpj="12345678000199", senha="teste123")
    with pytest.raises(CnpjIncompativel):
        certificado.inspecionar(pfx, "teste123", cnpj_empresa="99999999000199", agora=HOJE)


def test_material_mtls_cria_e_remove_pem():
    pfx = fab.make_a1(senha="teste123")
    with certificado.material_mtls(pfx, "teste123") as (cert_pem, key_pem):
        assert os.path.exists(cert_pem) and os.path.exists(key_pem)
        # permissão restritiva 0600
        assert oct(os.stat(key_pem).st_mode)[-3:] == "600"
        with open(cert_pem, "rb") as fh:
            assert b"BEGIN CERTIFICATE" in fh.read()
    # removidos ao sair do contexto
    assert not os.path.exists(cert_pem)
    assert not os.path.exists(key_pem)
