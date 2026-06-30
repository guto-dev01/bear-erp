'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS1010 } = require('../esocial/eventos/s1010');
const { assinarEvento, verificarAssinatura } = require('../esocial/assinatura/xmldsig');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');
const { MONTADORES } = require('../esocial/transmissao');

const DATA = new Date('2026-06-09T10:00:00');

function dadosBase(over = {}) {
  return {
    tpAmb: 2,
    tpInsc: 1,
    nrInsc: '12345678', // raiz (8) — completada a 14 no Id
    operacao: 'inclusao',
    ideRubrica: { codRubr: 'SAL01', ideTabRubr: '01', iniValid: '2026-06' },
    dadosRubrica: {
      dscRubr: 'Salário base',
      natRubr: '1000',
      tpRubr: 1,
      codIncCP: '11',
      codIncIRRF: '11',
      codIncFGTS: '11',
    },
    ...over,
  };
}

test('montarS1010 gera XML bem-formado com namespace evtTabRubrica da S-1.3', () => {
  const { xml, id, alias } = montarS1010(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtTabRubrica');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtTabRubrica\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<infoRubrica><inclusao>/);
  assert.match(xml, /<codRubr>SAL01<\/codRubr>/);
  assert.match(xml, /<natRubr>1000<\/natRubr>/);
  assert.match(xml, /<codIncCP>11<\/codIncCP>/);
});

test('Id usa o CNPJ completado a 14 e tem 36 chars', () => {
  const { id } = montarS1010(dadosBase(), { data: DATA });
  assert.equal(id.length, 36);
  assert.equal(id, 'ID112345678000000' + '20260609100000' + '00001');
});

test('exclusao carrega apenas ideRubrica (sem dadosRubrica)', () => {
  const { xml } = montarS1010(
    dadosBase({ operacao: 'exclusao', dadosRubrica: undefined }),
    { data: DATA },
  );
  assert.match(xml, /<infoRubrica><exclusao>/);
  assert.match(xml, /<codRubr>SAL01<\/codRubr>/);
  assert.doesNotMatch(xml, /dadosRubrica/);
});

test('alteracao com novaValidade emite o bloco', () => {
  const { xml } = montarS1010(
    dadosBase({ operacao: 'alteracao', novaValidade: { iniValid: '2026-07' } }),
    { data: DATA },
  );
  assert.match(xml, /<infoRubrica><alteracao>/);
  assert.match(xml, /<novaValidade><iniValid>2026-07<\/iniValid><\/novaValidade>/);
});

test('processos vinculados (ideProcessoCP) suportam 1..N', () => {
  const { xml } = montarS1010(
    dadosBase({
      dadosRubrica: {
        ...dadosBase().dadosRubrica,
        ideProcessoCP: [
          { tpProc: 1, nrProc: '0001', codSusp: '90' },
          { tpProc: 2, nrProc: '0002' },
        ],
      },
    }),
    { data: DATA },
  );
  assert.equal((xml.match(/<ideProcessoCP>/g) || []).length, 2);
});

test('rejeita inclusao sem dadosRubrica e sem incidências', () => {
  assert.throws(() => montarS1010(dadosBase({ dadosRubrica: undefined })), /dadosRubrica/);
  assert.throws(
    () => montarS1010(dadosBase({ dadosRubrica: { dscRubr: 'x', natRubr: '1', tpRubr: 1, codIncCP: '11', codIncIRRF: '11' } })),
    /codIncFGTS/,
  );
});

test('rejeita iniValid fora do formato aaaa-mm', () => {
  assert.throws(() => montarS1010(dadosBase({ ideRubrica: { codRubr: 'x', ideTabRubr: '1', iniValid: '2026' } })), /iniValid/);
});

test('S-1010 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-1010'], 'function');
});

test('o XML do evtTabRubrica é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1010(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.match(assinado, /<(\w+:)?Signature/);
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
