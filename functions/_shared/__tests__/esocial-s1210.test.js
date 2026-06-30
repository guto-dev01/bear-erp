'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS1210 } = require('../esocial/eventos/s1210');
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
    ideBenef: [
      {
        cpfBenef: '12345678909',
        infoPgto: [
          { dtPgto: '2026-06-05', tpPgto: 1, ideDmDev: 'FOLHA-2026-05', vrLiq: '2750.00' },
        ],
      },
    ],
    ...over,
  };
}

test('montarS1210 gera XML bem-formado com namespace evtPgtos da S-1.3', () => {
  const { xml, id, alias } = montarS1210(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtPgtos');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtPgtos\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<cpfBenef>12345678909<\/cpfBenef>/);
  assert.match(xml, /<dtPgto>2026-06-05<\/dtPgto>/);
  assert.match(xml, /<vrLiq>2750\.00<\/vrLiq>/);
});

test('múltiplos beneficiários e pagamentos (1..N)', () => {
  const { xml } = montarS1210(
    dadosBase({
      ideBenef: [
        { cpfBenef: '12345678909', infoPgto: [{ dtPgto: '2026-06-05', tpPgto: 1, vrLiq: '100.00' }] },
        { cpfBenef: '98765432100', infoPgto: [
          { dtPgto: '2026-06-05', tpPgto: 1, vrLiq: '200.00' },
          { dtPgto: '2026-06-20', tpPgto: 1, vrLiq: '50.00' },
        ] },
      ],
    }),
    { data: DATA },
  );
  assert.equal((xml.match(/<ideBenef>/g) || []).length, 2);
  assert.equal((xml.match(/<infoPgto>/g) || []).length, 3);
});

test('rejeita dtPgto inválido e vrLiq ausente', () => {
  assert.throws(
    () => montarS1210(dadosBase({ ideBenef: [{ cpfBenef: '12345678909', infoPgto: [{ dtPgto: '05/06/2026', tpPgto: 1, vrLiq: '1' }] }] })),
    /dtPgto/,
  );
  assert.throws(
    () => montarS1210(dadosBase({ ideBenef: [{ cpfBenef: '12345678909', infoPgto: [{ dtPgto: '2026-06-05', tpPgto: 1 }] }] })),
    /vrLiq/,
  );
});

test('valida CPF do beneficiário (11 dígitos)', () => {
  assert.throws(() => montarS1210(dadosBase({ ideBenef: [{ cpfBenef: '123', infoPgto: [{ dtPgto: '2026-06-05', tpPgto: 1, vrLiq: '1' }] }] })), /cpfBenef/);
});

test('S-1210 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-1210'], 'function');
});

test('o XML do evtPgtos é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1210(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
