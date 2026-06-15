'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS3000 } = require('../esocial/eventos/s3000');
const { assinarEvento, verificarAssinatura } = require('../esocial/assinatura/xmldsig');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');
const { MONTADORES } = require('../esocial/transmissao');

const DATA = new Date('2026-06-09T10:00:00');

function dadosBase(over = {}) {
  return {
    tpAmb: 2,
    tpInsc: 1,
    nrInsc: '12345678000199',
    infoExclusao: { tpEvento: 'S-2200', nrRecEvt: '1.2.0000000000000000001' },
    ...over,
  };
}

test('montarS3000 gera XML bem-formado com namespace evtExclusao da S-1.3', () => {
  const { xml, id, alias } = montarS3000(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtExclusao');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtExclusao\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<tpEvento>S-2200<\/tpEvento>/);
  assert.match(xml, /<nrRecEvt>1\.2\.0000000000000000001<\/nrRecEvt>/);
});

test('ideTrabalhador é emitido quando fornecido', () => {
  const { xml } = montarS3000(dadosBase({ infoExclusao: { tpEvento: 'S-2230', nrRecEvt: '1.2.3', ideTrabalhador: { cpfTrab: '12345678909' } } }), { data: DATA });
  assert.match(xml, /<ideTrabalhador><cpfTrab>12345678909<\/cpfTrab><\/ideTrabalhador>/);
});

test('ideFolhaPagto é emitido para evento periódico', () => {
  const { xml } = montarS3000(dadosBase({ infoExclusao: { tpEvento: 'S-1200', nrRecEvt: '1.2.3', ideFolhaPagto: { indApuracao: 1, perApur: '2026-05' } } }), { data: DATA });
  assert.match(xml, /<ideFolhaPagto><indApuracao>1<\/indApuracao><perApur>2026-05<\/perApur><\/ideFolhaPagto>/);
});

test('campos opcionais ausentes não aparecem', () => {
  const { xml } = montarS3000(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /ideTrabalhador/);
  assert.doesNotMatch(xml, /ideFolhaPagto/);
});

test('rejeita tpEvento mal formado e nrRecEvt ausente', () => {
  assert.throws(() => montarS3000(dadosBase({ infoExclusao: { tpEvento: '2200', nrRecEvt: '1.2.3' } })), /tpEvento/);
  assert.throws(() => montarS3000(dadosBase({ infoExclusao: { tpEvento: 'S-2200' } })), /nrRecEvt/);
});

test('S-3000 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-3000'], 'function');
});

test('o XML do evtExclusao é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS3000(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
