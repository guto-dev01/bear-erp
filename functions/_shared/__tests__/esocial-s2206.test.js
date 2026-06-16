'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2206 } = require('../esocial/eventos/s2206');
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
    altContratual: {
      dtAlteracao: '2026-06-01',
      dscAlt: 'Promoção a sênior',
      vinculo: {
        infoContrato: {
          codCargo: 'C02',
          codCateg: 101,
          remuneracao: { vrSalFx: '4500.00', undSalFixo: 5 },
          duracao: { tpContr: 1 },
          horContratual: { qtdHrsSem: '44', tpJornada: 1, tmpParc: 0 },
        },
      },
    },
    ...over,
  };
}

test('montarS2206 gera XML bem-formado com namespace evtAltContratual da S-1.3', () => {
  const { xml, id, alias } = montarS2206(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtAltContratual');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtAltContratual\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<cpfTrab>12345678909<\/cpfTrab>/);
  assert.match(xml, /<matricula>M-001<\/matricula>/);
  assert.match(xml, /<dtAlteracao>2026-06-01<\/dtAlteracao>/);
  assert.match(xml, /<vrSalFx>4500\.00<\/vrSalFx>/);
});

test('emite dtEf quando informado, omite quando ausente', () => {
  const { xml: semEf } = montarS2206(dadosBase(), { data: DATA });
  assert.doesNotMatch(semEf, /dtEf/);
  const { xml: comEf } = montarS2206(dadosBase({ altContratual: { ...dadosBase().altContratual, dtEf: '2026-06-05' } }), { data: DATA });
  assert.match(comEf, /<dtEf>2026-06-05<\/dtEf>/);
});

test('rejeita ideVinculo sem matrícula e dtAlteracao inválida', () => {
  assert.throws(() => montarS2206(dadosBase({ ideVinculo: { cpfTrab: '12345678909' } })), /matricula/);
  assert.throws(() => montarS2206(dadosBase({ altContratual: { ...dadosBase().altContratual, dtAlteracao: '01/06/2026' } })), /dtAlteracao/);
});

test('rejeita altContratual sem infoContrato', () => {
  assert.throws(() => montarS2206(dadosBase({ altContratual: { dtAlteracao: '2026-06-01', vinculo: {} } })), /infoContrato/);
});

test('S-2206 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2206'], 'function');
});

test('o XML do evtAltContratual é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2206(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
