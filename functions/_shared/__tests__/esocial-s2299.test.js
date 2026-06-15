'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2299 } = require('../esocial/eventos/s2299');
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
    infoDeslig: { mtvDeslig: '02', dtDeslig: '2026-06-15', pensAlim: 0 },
    ...over,
  };
}

test('montarS2299 gera XML bem-formado com namespace evtDeslig da S-1.3', () => {
  const { xml, id, alias } = montarS2299(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtDeslig');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtDeslig\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<mtvDeslig>02<\/mtvDeslig>/);
  assert.match(xml, /<dtDeslig>2026-06-15<\/dtDeslig>/);
  assert.match(xml, /<pensAlim>0<\/pensAlim>/);
});

test('verbasResc com dmDev/itensRemun é emitido quando fornecido', () => {
  const { xml } = montarS2299(
    dadosBase({
      infoDeslig: {
        mtvDeslig: '02',
        dtDeslig: '2026-06-15',
        pensAlim: 0,
        verbasResc: {
          dmDev: [
            {
              ideDmDev: 'RESC-01',
              codCateg: 101,
              ideEstabLot: [
                { tpInsc: 1, nrInsc: '12345678000199', codLotacao: 'LOT01', remunPerApur: [{ matricula: 'M-001', itensRemun: [{ codRubr: 'SALD', ideTabRubr: '01', vrRubr: '1500.00' }] }] },
              ],
            },
          ],
        },
      },
    }),
    { data: DATA },
  );
  assert.match(xml, /<verbasResc>/);
  assert.match(xml, /<ideDmDev>RESC-01<\/ideDmDev>/);
  assert.match(xml, /<codRubr>SALD<\/codRubr>/);
});

test('pensão alimentícia exige percAliment/vrAlim conforme o tipo', () => {
  assert.throws(() => montarS2299(dadosBase({ infoDeslig: { mtvDeslig: '02', dtDeslig: '2026-06-15', pensAlim: 1 } })), /percAliment/);
  assert.throws(() => montarS2299(dadosBase({ infoDeslig: { mtvDeslig: '02', dtDeslig: '2026-06-15', pensAlim: 2 } })), /vrAlim/);
  const { xml } = montarS2299(dadosBase({ infoDeslig: { mtvDeslig: '02', dtDeslig: '2026-06-15', pensAlim: 3, percAliment: '30.00', vrAlim: '450.00' } }), { data: DATA });
  assert.match(xml, /<percAliment>30\.00<\/percAliment>/);
  assert.match(xml, /<vrAlim>450\.00<\/vrAlim>/);
});

test('rejeita ideVinculo sem matrícula e infoDeslig incompleto', () => {
  assert.throws(() => montarS2299(dadosBase({ ideVinculo: { cpfTrab: '12345678909' } })), /matricula/);
  assert.throws(() => montarS2299(dadosBase({ infoDeslig: { dtDeslig: '2026-06-15', pensAlim: 0 } })), /mtvDeslig/);
  assert.throws(() => montarS2299(dadosBase({ infoDeslig: { mtvDeslig: '02', dtDeslig: '15/06/2026', pensAlim: 0 } })), /dtDeslig/);
});

test('S-2299 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2299'], 'function');
});

test('o XML do evtDeslig é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2299(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
