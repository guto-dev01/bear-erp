'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS1200 } = require('../esocial/eventos/s1200');
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
    ideTrabalhador: { cpfTrab: '12345678909' },
    dmDev: [
      {
        ideDmDev: 'FOLHA-2026-05',
        codCateg: 101,
        ideEstabLot: [
          {
            tpInsc: 1,
            nrInsc: '12345678000199',
            codLotacao: 'LOT01',
            remunPerApur: [
              {
                matricula: 'M-001',
                itensRemun: [
                  { codRubr: 'SAL01', ideTabRubr: '01', vrRubr: '3000.00' },
                ],
              },
            ],
          },
        ],
      },
    ],
    ...over,
  };
}

test('montarS1200 gera XML bem-formado com namespace evtRemun da S-1.3', () => {
  const { xml, id, alias } = montarS1200(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtRemun');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtRemun\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<perApur>2026-05<\/perApur>/);
  assert.match(xml, /<cpfTrab>12345678909<\/cpfTrab>/);
  assert.match(xml, /<ideDmDev>FOLHA-2026-05<\/ideDmDev>/);
  assert.match(xml, /<codRubr>SAL01<\/codRubr>/);
  assert.match(xml, /<vrRubr>3000\.00<\/vrRubr>/);
});

test('campos opcionais ausentes não aparecem (infoComplem, nrRecibo)', () => {
  const { xml } = montarS1200(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /infoComplem/);
  assert.doesNotMatch(xml, /nrRecibo/);
});

test('infoComplem é emitido na 1ª declaração do trabalhador', () => {
  const { xml } = montarS1200(
    dadosBase({ ideTrabalhador: { cpfTrab: '12345678909', infoComplem: { nmTrab: 'Fulano de Tal', dtNascto: '1990-01-01' } } }),
    { data: DATA },
  );
  assert.match(xml, /<infoComplem><nmTrab>Fulano de Tal<\/nmTrab>/);
});

test('apuração anual (indApuracao=2) aceita perApur aaaa', () => {
  const { xml } = montarS1200(dadosBase({ indApuracao: 2, perApur: '2026' }), { data: DATA });
  assert.match(xml, /<indApuracao>2<\/indApuracao>/);
  assert.match(xml, /<perApur>2026<\/perApur>/);
});

test('retificação exige nrRecibo e o emite', () => {
  assert.throws(() => montarS1200(dadosBase({ indRetif: 2 })), /nrRecibo/);
  const { xml } = montarS1200(dadosBase({ indRetif: 2, nrRecibo: '1.2.3' }), { data: DATA });
  assert.match(xml, /<indRetif>2<\/indRetif>/);
  assert.match(xml, /<nrRecibo>1\.2\.3<\/nrRecibo>/);
});

test('rejeita perApur inválido e itensRemun vazio', () => {
  assert.throws(() => montarS1200(dadosBase({ perApur: '2026' })), /perApur/);
  assert.throws(
    () =>
      montarS1200(
        dadosBase({ dmDev: [{ ...dadosBase().dmDev[0], ideEstabLot: [{ tpInsc: 1, nrInsc: '1', codLotacao: 'L', remunPerApur: [{ itensRemun: [] }] }] }] }),
      ),
    /itensRemun/,
  );
});

test('valida CPF do trabalhador (11 dígitos)', () => {
  assert.throws(() => montarS1200(dadosBase({ ideTrabalhador: { cpfTrab: '123' } })), /cpfTrab/);
});

test('S-1200 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-1200'], 'function');
});

test('o XML do evtRemun é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1200(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
