'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2240 } = require('../esocial/eventos/sst/s2240');
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
    infoExpRisco: {
      dtIniCondicao: '2026-06-01',
      infoAmb: [{ localAmb: 1, dscSetor: 'Produção', tpInsc: 1, nrInsc: '12345678000199' }],
      infoAtiv: { dscAtivDes: 'Operação de máquinas' },
      agNoc: [{ codAgNoc: '01.01.001', dscAgNoc: 'Ruído', tpAval: 1, intConc: '85', unMed: '23' }],
      respReg: [{ cpfResp: '98765432100', ideOC: 9, dscOC: 'Eng. Segurança', nrOC: '12345', ufOC: 'SP' }],
    },
    ...over,
  };
}

test('montarS2240 gera XML bem-formado com namespace evtExpRisco da S-1.3', () => {
  const { xml, id, alias } = montarS2240(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtExpRisco');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtExpRisco\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<dtIniCondicao>2026-06-01<\/dtIniCondicao>/);
  assert.match(xml, /<dscSetor>Produção<\/dscSetor>/);
  assert.match(xml, /<codAgNoc>01\.01\.001<\/codAgNoc>/);
  assert.match(xml, /<dscAtivDes>Operação de máquinas<\/dscAtivDes>/);
});

test('infoAmb, agNoc e respReg suportam 1..N', () => {
  const { xml } = montarS2240(
    dadosBase({
      infoExpRisco: {
        ...dadosBase().infoExpRisco,
        infoAmb: [
          { localAmb: 1, dscSetor: 'Produção', tpInsc: 1, nrInsc: '12345678000199' },
          { localAmb: 2, dscSetor: 'Logística', tpInsc: 1, nrInsc: '12345678000280' },
        ],
        agNoc: [
          { codAgNoc: '01.01.001' },
          { codAgNoc: '02.01.014' },
        ],
      },
    }),
    { data: DATA },
  );
  assert.equal((xml.match(/<infoAmb>/g) || []).length, 2);
  assert.equal((xml.match(/<agNoc>/g) || []).length, 2);
});

test('obs é emitido como obsCompl quando informado', () => {
  const { xml } = montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, obs: 'Uso obrigatório de EPI' } }), { data: DATA });
  assert.match(xml, /<obs><obsCompl>Uso obrigatório de EPI<\/obsCompl><\/obs>/);
});

test('rejeita ausência de agNoc, infoAmb ou respReg', () => {
  assert.throws(() => montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, agNoc: [] } })), /agNoc/);
  assert.throws(() => montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, infoAmb: [] } })), /infoAmb/);
  assert.throws(() => montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, respReg: [] } })), /respReg/);
});

test('rejeita dtIniCondicao inválida e CPF do responsável inválido', () => {
  assert.throws(() => montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, dtIniCondicao: '01/06/2026' } })), /dtIniCondicao/);
  assert.throws(() => montarS2240(dadosBase({ infoExpRisco: { ...dadosBase().infoExpRisco, respReg: [{ cpfResp: '123', ideOC: 9 }] } })), /cpfResp/);
});

test('S-2240 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2240'], 'function');
});

test('o XML do evtExpRisco é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2240(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
