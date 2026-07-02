from lxml import etree

from fiscal_sefaz.config import Ambiente, NS_NFE
from fiscal_sefaz.distribuicao import consultar_distribuicao, montar_envelope, parsear_resposta
from fiscal_sefaz.models import TipoDocumento
from fiscal_sefaz.tests import _fabricas as fab


def _localtext(root, name):
    got = root.xpath(f".//*[local-name()=$n]/text()", n=name)
    return got[0] if got else None


def test_montar_envelope_campos_obrigatorios():
    body = montar_envelope("12.345.678/0001-99", "SP", Ambiente.HOMOLOGACAO, "0")
    root = etree.fromstring(body)
    assert _localtext(root, "tpAmb") == "2"
    assert _localtext(root, "cUFAutor") == "35"          # SP
    assert _localtext(root, "CNPJ") == "12345678000199"  # só dígitos
    assert _localtext(root, "ultNSU") == "000000000000000"  # 15 dígitos
    # versão do leiaute
    dist = root.xpath(".//*[local-name()='distDFeInt']")[0]
    assert dist.get("versao") == "1.35"


def test_envelope_nsu_zero_pad():
    body = montar_envelope("12345678000199", "MG", Ambiente.PRODUCAO, 42)
    root = etree.fromstring(body)
    assert _localtext(root, "ultNSU") == "000000000000042"
    assert _localtext(root, "cUFAutor") == "31"  # MG
    assert _localtext(root, "tpAmb") == "1"


def test_consulta_com_documentos_138():
    docs = [
        ("000000000000001", "resNFe_v1.01.xsd", fab.xml_res_nfe()),
        ("000000000000002", "procNFe_v4.00.xsd", fab.xml_proc_nfe()),
        ("000000000000003", "resEvento_v1.01.xsd", fab.xml_res_evento()),
    ]
    resposta = fab.soap_resposta(cstat=138, docs=docs, ult_nsu="000000000000003", max_nsu="000000000000003")

    res = consultar_distribuicao(
        cnpj="12345678000199", uf="SP", ambiente=Ambiente.HOMOLOGACAO, ult_nsu="0",
        transport=lambda url, body: resposta,
    )
    assert res.cstat == 138
    assert res.ha_documentos is True
    assert len(res.documentos) == 3
    assert res.fim_do_lote is True  # ultNSU == maxNSU
    tipos = {d.tipo for d in res.documentos}
    assert TipoDocumento.PROC_NFE in tipos and TipoDocumento.RES_NFE in tipos


def test_consulta_sem_novos_137():
    resposta = fab.soap_resposta(cstat=137, motivo="Nenhum documento localizado",
                                 ult_nsu="000000000000010", max_nsu="000000000000010", docs=[])
    res = consultar_distribuicao(
        cnpj="12345678000199", uf="RS", ambiente="homologacao", ult_nsu="10",
        transport=lambda url, body: resposta,
    )
    assert res.cstat == 137
    assert res.sem_novos is True
    assert res.documentos == []
    assert res.backoff_recomendado_seg == 3600


def test_consulta_consumo_indevido_656():
    resposta = fab.soap_resposta(cstat=656, motivo="Consumo Indevido",
                                 ult_nsu="000000000000000", max_nsu="000000000000000", docs=[])
    res = consultar_distribuicao(
        cnpj="12345678000199", uf="SP", ambiente="homologacao", ult_nsu="0",
        transport=lambda url, body: resposta,
    )
    assert res.consumo_indevido is True
    assert res.backoff_recomendado_seg >= 3600


def test_endpoint_por_ambiente_no_transport():
    capturado = {}

    def transport(url, body):
        capturado["url"] = url
        return fab.soap_resposta(cstat=137, docs=[])

    consultar_distribuicao(cnpj="12345678000199", uf="SP", ambiente="producao", ult_nsu="0", transport=transport)
    assert "www1.nfe.fazenda.gov.br" in capturado["url"]  # produção AN

    consultar_distribuicao(cnpj="12345678000199", uf="SP", ambiente="homologacao", ult_nsu="0", transport=transport)
    assert "hom1.nfe.fazenda.gov.br" in capturado["url"]  # homologação AN


def test_doc_corrompido_nao_derruba_lote():
    resposta = fab.soap_resposta(
        cstat=138,
        docs=[("000000000000001", "resNFe_v1.01.xsd", fab.xml_res_nfe())],
    )
    # injeta um docZip inválido no meio da resposta
    resposta = resposta.replace(
        "</loteDistDFeInt>",
        '<docZip NSU="000000000000002" schema="procNFe_v4.00.xsd">###invalido###</docZip></loteDistDFeInt>',
    )
    res = consultar_distribuicao(
        cnpj="12345678000199", uf="SP", ambiente="homologacao", ult_nsu="0",
        transport=lambda url, body: resposta,
    )
    assert len(res.documentos) == 2
    com_erro = [d for d in res.documentos if d.tipo is TipoDocumento.DESCONHECIDO]
    assert len(com_erro) == 1 and "erro" in com_erro[0].dados
