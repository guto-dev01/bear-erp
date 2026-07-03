import base64
import hashlib

import pytest

from fiscal_sefaz.docparser import decodificar_doczip, processar_documento, sha256_hex
from fiscal_sefaz.errors import RespostaInvalida
from fiscal_sefaz.models import TipoDocumento
from fiscal_sefaz.tests import _fabricas as fab


def test_res_nfe_parseado():
    xml = fab.xml_res_nfe(vnf="1500.00")
    doc = processar_documento("000000000000001", "resNFe_v1.01.xsd", fab.doczip(xml))
    assert doc.tipo is TipoDocumento.RES_NFE
    assert doc.access_key == "35240712345678000199550010000000011000000017"
    assert doc.cnpj_emitente == "12345678000199"
    assert doc.dados["vNF"] == "1500.00"
    assert doc.xml_size > 0
    assert doc.xml_hash == hashlib.sha256(xml.encode()).hexdigest()


def test_proc_nfe_chave_do_id_e_emitente():
    xml = fab.xml_proc_nfe(nnf="2", vnf="2500.00")
    doc = processar_documento("000000000000002", "procNFe_v4.00.xsd", fab.doczip(xml))
    assert doc.tipo is TipoDocumento.PROC_NFE
    assert doc.access_key == "35240712345678000199550010000000021000000025"
    # deve pegar o CNPJ do <emit>, não do <dest>
    assert doc.cnpj_emitente == "12345678000199"
    assert doc.dados["nNF"] == "2"
    assert doc.dados["nProt"] == "135260000000001"


def test_res_evento_descricao():
    xml = fab.xml_res_evento(tp="210200")
    doc = processar_documento("000000000000003", "resEvento_v1.01.xsd", fab.doczip(xml))
    assert doc.tipo is TipoDocumento.RES_EVENTO
    assert doc.dados["tpEvento"] == "210200"
    assert doc.dados["descEvento"] == "Confirmação da Operação"


def test_proc_evento_cancelamento():
    xml = fab.xml_proc_evento(tp="110111")
    doc = processar_documento("000000000000004", "procEventoNFe_v1.00.xsd", fab.doczip(xml))
    assert doc.tipo is TipoDocumento.PROC_EVENTO_NFE
    assert doc.dados["descEvento"] == "Cancelamento"


def test_schema_desconhecido_cai_para_raiz():
    xml = fab.xml_res_nfe()
    doc = processar_documento("5", "algoNovo_v9.xsd", fab.doczip(xml))
    # cai para a raiz do XML → resNFe
    assert doc.tipo is TipoDocumento.RES_NFE


def test_base64_invalido():
    with pytest.raises(RespostaInvalida):
        decodificar_doczip("###nao-e-base64###")


def test_gzip_invalido():
    # base64 válido, mas não é gzip
    conteudo = base64.b64encode(b"conteudo qualquer").decode()
    with pytest.raises(RespostaInvalida):
        decodificar_doczip(conteudo)


def test_hash_estavel():
    assert sha256_hex(b"abc") == hashlib.sha256(b"abc").hexdigest()
