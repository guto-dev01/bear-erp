import pytest

from fiscal_sefaz.config import Ambiente, codigo_uf, endpoint_distribuicao


def test_ambiente_from_str():
    assert Ambiente.from_str("producao") is Ambiente.PRODUCAO
    assert Ambiente.from_str("Produção") is Ambiente.PRODUCAO
    assert Ambiente.from_str("homologacao") is Ambiente.HOMOLOGACAO
    assert Ambiente.from_str("2") is Ambiente.HOMOLOGACAO
    assert int(Ambiente.PRODUCAO) == 1 and int(Ambiente.HOMOLOGACAO) == 2


def test_ambiente_invalido():
    with pytest.raises(ValueError):
        Ambiente.from_str("staging")


def test_codigo_uf():
    assert codigo_uf("SP") == 35
    assert codigo_uf("sp") == 35
    assert codigo_uf("RS") == 43
    with pytest.raises(ValueError):
        codigo_uf("XX")


def test_endpoint_por_ambiente():
    assert "hom1.nfe" in endpoint_distribuicao(Ambiente.HOMOLOGACAO).url
    assert "www1.nfe" in endpoint_distribuicao(Ambiente.PRODUCAO).url
