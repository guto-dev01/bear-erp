'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarEventoCancelamento, montarEventoCCe, montarInutilizacao } = require('../nfe/eventos');
const { assinarElemento, verificarAssinatura } = require('../nfe/assinatura');
const { montarEnvEvento, envelopeEvento, envelopeInutilizacao, WSDL } = require('../nfe/soap');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

const CHAVE = '35260512345678000199550010000010011000070203';
const CNPJ = '12345678000199';
const NPROT = '135260000000001';
const DH = '2026-07-01T10:00:00-03:00';
const JUST = 'Cancelamento por erro de digitacao no valor';

function material() {
  const { pfx, senha } = gerarPfxTeste();
  return lerPkcs12(pfx, senha);
}

test('cancelamento: infEvento @Id, tpEvento 110111, nProt e xJust presentes', () => {
  const xml = montarEventoCancelamento({ chave: CHAVE, cnpj: CNPJ, nProt: NPROT, xJust: JUST, dhEvento: DH });
  assert.ok(xml.includes(`<infEvento Id="ID110111${CHAVE}01">`), 'Id do evento');
  assert.ok(xml.includes('<tpEvento>110111</tpEvento>'));
  assert.ok(xml.includes(`<nProt>${NPROT}</nProt>`));
  assert.ok(xml.includes('<descEvento>Cancelamento</descEvento>'));
});

test('cancelamento rejeita justificativa curta e protocolo ausente', () => {
  assert.throws(() => montarEventoCancelamento({ chave: CHAVE, cnpj: CNPJ, nProt: NPROT, xJust: 'curta', dhEvento: DH }));
  assert.throws(() => montarEventoCancelamento({ chave: CHAVE, cnpj: CNPJ, xJust: JUST, dhEvento: DH }));
});

test('CC-e: tpEvento 110110 com xCorrecao e xCondUso legal', () => {
  const xml = montarEventoCCe({ chave: CHAVE, cnpj: CNPJ, xCorrecao: 'Corrigido o nome do transportador', dhEvento: DH });
  assert.ok(xml.includes('<tpEvento>110110</tpEvento>'));
  assert.ok(xml.includes('<xCorrecao>Corrigido o nome do transportador</xCorrecao>'));
  assert.ok(xml.includes('<xCondUso>A Carta de Correcao'));
});

test('inutilização: infInut @Id (43 chars) e faixa nNFIni/nNFFin', () => {
  const xml = montarInutilizacao({ cUF: '35', ano: 2026, cnpj: CNPJ, mod: '55', serie: '1', nNFIni: '10', nNFFin: '15', xJust: 'Inutilizacao por salto de numeracao' });
  assert.ok(xml.includes(`<infInut Id="ID3526${CNPJ}55001000000010000000015">`), 'Id da inutilização');
  assert.ok(xml.includes('<xServ>INUTILIZAR</xServ>'));
  assert.ok(xml.includes('<nNFIni>10</nNFIni><nNFFin>15</nNFFin>'));
});

test('inutilização rejeita faixa invertida (nNFIni > nNFFin)', () => {
  assert.throws(() => montarInutilizacao({ cUF: '35', ano: 2026, cnpj: CNPJ, serie: '1', nNFIni: '20', nNFFin: '10', xJust: 'Justificativa suficiente aqui' }));
});

test('assinatura genérica assina o infEvento (cancelamento) — válida', () => {
  const mat = material();
  const xml = montarEventoCancelamento({ chave: CHAVE, cnpj: CNPJ, nProt: NPROT, xJust: JUST, dhEvento: DH });
  const assinado = assinarElemento(xml, 'infEvento', mat);
  assert.ok(assinado.includes(`URI="#ID110111${CHAVE}01"`), 'Reference aponta p/ o @Id do infEvento');
  assert.equal(verificarAssinatura(assinado, mat.leafPem), true);
});

test('assinatura genérica assina o infInut (inutilização) — válida', () => {
  const mat = material();
  const xml = montarInutilizacao({ cUF: '35', ano: 2026, cnpj: CNPJ, serie: '1', nNFIni: '10', nNFFin: '15', xJust: 'Inutilizacao por salto de numeracao' });
  const assinado = assinarElemento(xml, 'infInut', mat);
  assert.equal(verificarAssinatura(assinado, mat.leafPem), true);
});

test('envelopes: RecepcaoEvento4 (envEvento) e Inutilizacao4', () => {
  const ev = montarEventoCancelamento({ chave: CHAVE, cnpj: CNPJ, nProt: NPROT, xJust: JUST, dhEvento: DH });
  const envEv = envelopeEvento(montarEnvEvento(ev, { idLote: '1' }));
  assert.equal(envEv.soapAction, WSDL.NFeRecepcaoEvento4);
  assert.ok(envEv.xmlEnvelope.includes('<envEvento versao="1.00"'));

  const inut = montarInutilizacao({ cUF: '35', ano: 2026, cnpj: CNPJ, serie: '1', nNFIni: '10', nNFFin: '15', xJust: 'Inutilizacao por salto de numeracao' });
  const envInut = envelopeInutilizacao(inut);
  assert.equal(envInut.soapAction, WSDL.NFeInutilizacao4);
  assert.ok(envInut.xmlEnvelope.includes('<inutNFe versao="4.00"'));
});
