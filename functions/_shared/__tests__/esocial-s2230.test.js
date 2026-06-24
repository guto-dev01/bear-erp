'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2230 } = require('../esocial/eventos/s2230');
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
    ideVinculo: { cpfTrab: '12345678909', matricula: 'M-001' },
    infoAfastamento: {
      iniAfastamento: { dtIniAfast: '2026-06-02', codMotAfast: '01' },
    },
    ...over,
  };
}

test('montarS2230 gera XML bem-formado com namespace evtAfastTemp da S-1.3', () => {
  const { xml, id, alias } = montarS2230(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtAfastTemp');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtAfastTemp\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<iniAfastamento><dtIniAfast>2026-06-02<\/dtIniAfast>/);
  assert.match(xml, /<codMotAfast>01<\/codMotAfast>/);
});

test('apenas o término (fimAfastamento) é aceito sem início', () => {
  const { xml } = montarS2230(
    dadosBase({ infoAfastamento: { fimAfastamento: { dtTermAfast: '2026-06-20' } } }),
    { data: DATA },
  );
  assert.match(xml, /<fimAfastamento><dtTermAfast>2026-06-20<\/dtTermAfast><\/fimAfastamento>/);
  assert.doesNotMatch(xml, /iniAfastamento/);
});

test('início + término no mesmo evento', () => {
  const { xml } = montarS2230(
    dadosBase({ infoAfastamento: { iniAfastamento: { dtIniAfast: '2026-06-02', codMotAfast: '01' }, fimAfastamento: { dtTermAfast: '2026-06-10' } } }),
    { data: DATA },
  );
  assert.match(xml, /iniAfastamento/);
  assert.match(xml, /fimAfastamento/);
});

test('rejeita infoAfastamento vazio e dtIniAfast inválida', () => {
  assert.throws(() => montarS2230(dadosBase({ infoAfastamento: {} })), /iniAfastamento ou .fimAfastamento|iniAfastamento/);
  assert.throws(
    () => montarS2230(dadosBase({ infoAfastamento: { iniAfastamento: { dtIniAfast: '02/06/2026', codMotAfast: '01' } } })),
    /dtIniAfast/,
  );
});

test('valida CPF do trabalhador (11 dígitos)', () => {
  assert.throws(() => montarS2230(dadosBase({ ideVinculo: { cpfTrab: '123' } })), /cpfTrab/);
});

test('S-2230 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2230'], 'function');
});

test('o XML do evtAfastTemp é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2230(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
