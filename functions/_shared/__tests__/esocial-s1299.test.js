'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS1299 } = require('../esocial/eventos/s1299');
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
    indApuracao: 1,
    perApur: '2026-05',
    ideRespInf: { nmResp: 'Maria Contadora', cpfResp: '12345678909', email: 'maria@contabil.com' },
    infoFech: { evtRemun: 'S', evtPgtos: 'S', evtAqProd: 'N', evtComProd: 'N', evtContratAvNP: 'N', evtInfoComplPer: 'N' },
    ...over,
  };
}

test('montarS1299 gera XML bem-formado com namespace evtFechaEvPer da S-1.3', () => {
  const { xml, id, alias } = montarS1299(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtFechaEvPer');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtFechaEvPer\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<perApur>2026-05<\/perApur>/);
  assert.match(xml, /<nmResp>Maria Contadora<\/nmResp>/);
  assert.match(xml, /<evtRemun>S<\/evtRemun>/);
  assert.match(xml, /<evtPgtos>S<\/evtPgtos>/);
});

test('declaração sem movimento usa compSemMovto', () => {
  const { xml } = montarS1299(
    dadosBase({ infoFech: { evtRemun: 'N', evtPgtos: 'N', compSemMovto: '2026-05' } }),
    { data: DATA },
  );
  assert.match(xml, /<compSemMovto>2026-05<\/compSemMovto>/);
});

test('campos opcionais ausentes não aparecem (telefone)', () => {
  const { xml } = montarS1299(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /telefone/);
});

test('rejeita ideRespInf incompleto e flags inválidas', () => {
  assert.throws(() => montarS1299(dadosBase({ ideRespInf: { cpfResp: '12345678909' } })), /nmResp/);
  assert.throws(() => montarS1299(dadosBase({ infoFech: { evtRemun: 'X', evtPgtos: 'S' } })), /evtRemun/);
});

test('valida CPF do responsável (11 dígitos)', () => {
  assert.throws(() => montarS1299(dadosBase({ ideRespInf: { nmResp: 'M', cpfResp: '123' } })), /cpfResp/);
});

test('S-1299 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-1299'], 'function');
});

test('o XML do evtFechaEvPer é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1299(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
