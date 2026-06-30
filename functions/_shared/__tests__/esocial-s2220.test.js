'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2220 } = require('../esocial/eventos/sst/s2220');
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
    exMedOcup: {
      tpExameOcup: 0, // admissional
      aso: {
        dtAso: '2026-06-01',
        resAso: 1,
        exame: [{ dtExm: '2026-05-30', procRealizado: '0001' }],
        medico: { nmMed: 'Dra. Ana', nrCRM: '12345', ufCRM: 'SP' },
      },
    },
    ...over,
  };
}

test('montarS2220 gera XML bem-formado com namespace evtMonit da S-1.3', () => {
  const { xml, id, alias } = montarS2220(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtMonit');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtMonit\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<tpExameOcup>0<\/tpExameOcup>/);
  assert.match(xml, /<dtAso>2026-06-01<\/dtAso>/);
  assert.match(xml, /<nmMed>Dra\. Ana<\/nmMed>/);
  assert.match(xml, /<procRealizado>0001<\/procRealizado>/);
});

test('múltiplos exames (1..N) e respMonit opcional', () => {
  const { xml } = montarS2220(
    dadosBase({
      exMedOcup: {
        tpExameOcup: 1,
        aso: {
          dtAso: '2026-06-01',
          resAso: 1,
          exame: [
            { dtExm: '2026-05-30', procRealizado: '0001' },
            { dtExm: '2026-05-30', procRealizado: '0270', indResult: 1 },
          ],
          medico: { nmMed: 'Dra. Ana', nrCRM: '12345', ufCRM: 'SP' },
        },
        respMonit: { cpfResp: '98765432100', nmResp: 'Dr. Coord', nrCRM: '55555', ufCRM: 'SP' },
      },
    }),
    { data: DATA },
  );
  assert.equal((xml.match(/<exame>/g) || []).length, 2);
  assert.match(xml, /<respMonit><cpfResp>98765432100<\/cpfResp>/);
});

test('respMonit ausente não aparece', () => {
  const { xml } = montarS2220(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /respMonit/);
});

test('rejeita aso sem exame e médico incompleto', () => {
  assert.throws(
    () => montarS2220(dadosBase({ exMedOcup: { tpExameOcup: 0, aso: { dtAso: '2026-06-01', resAso: 1, exame: [], medico: { nmMed: 'X', nrCRM: '1', ufCRM: 'SP' } } } })),
    /exame/,
  );
  assert.throws(
    () => montarS2220(dadosBase({ exMedOcup: { tpExameOcup: 0, aso: { dtAso: '2026-06-01', resAso: 1, exame: [{ dtExm: '2026-05-30', procRealizado: '1' }], medico: { nmMed: 'X', nrCRM: '1', ufCRM: 'São Paulo' } } } })),
    /ufCRM/,
  );
});

test('valida CPF do trabalhador (11 dígitos)', () => {
  assert.throws(() => montarS2220(dadosBase({ ideVinculo: { cpfTrab: '123' } })), /cpfTrab/);
});

test('S-2220 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2220'], 'function');
});

test('o XML do evtMonit é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2220(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
