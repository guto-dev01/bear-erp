'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2200 } = require('../esocial/eventos/s2200');
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
    trabalhador: {
      cpfTrab: '12345678909',
      nmTrab: 'Fulano de Tal',
      sexo: 'M',
      racaCor: 1,
      grauInstr: '07',
      nascimento: { dtNascto: '1990-01-15', paisNascto: '105', paisNac: '105' },
      endereco: { brasil: { dscLograd: 'Rua A', nrLograd: '100', bairro: 'Centro', cep: '01001000', codMunic: '3550308', uf: 'SP' } },
    },
    vinculo: {
      matricula: 'M-001',
      tpRegTrab: 1,
      tpRegPrev: 1,
      infoRegimeTrab: {
        infoCeletista: { dtAdm: '2026-06-01', tpAdmissao: 1, indAdmissao: 1, tpRegJor: 1, natAtividade: 1 },
      },
      infoContrato: {
        codCargo: 'C01',
        codCateg: 101,
        remuneracao: { vrSalFx: '3000.00', undSalFixo: 5 },
        duracao: { tpContr: 1 },
        localTrabalho: { localTrabGeral: { tpInsc: 1, nrInsc: '12345678000199' } },
        horContratual: { qtdHrsSem: '44', tpJornada: 1, tmpParc: 0 },
      },
    },
    ...over,
  };
}

test('montarS2200 gera XML bem-formado com namespace evtAdmissao da S-1.3', () => {
  const { xml, id, alias } = montarS2200(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtAdmissao');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtAdmissao\/v_S_01_03_00">/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<nmTrab>Fulano de Tal<\/nmTrab>/);
  assert.match(xml, /<dtNascto>1990-01-15<\/dtNascto>/);
  assert.match(xml, /<dtAdm>2026-06-01<\/dtAdm>/);
  assert.match(xml, /<vrSalFx>3000\.00<\/vrSalFx>/);
  assert.match(xml, /<localTrabGeral><tpInsc>1<\/tpInsc>/);
});

test('campos opcionais ausentes não aparecem (nmSoc, exterior)', () => {
  const { xml } = montarS2200(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /nmSoc/);
  assert.doesNotMatch(xml, /exterior/);
  assert.doesNotMatch(xml, /nrRecibo/);
});

test('rejeita sexo inválido e endereço ausente', () => {
  assert.throws(() => montarS2200(dadosBase({ trabalhador: { ...dadosBase().trabalhador, sexo: 'X' } })), /sexo/);
  assert.throws(
    () => montarS2200(dadosBase({ trabalhador: { ...dadosBase().trabalhador, endereco: {} } })),
    /endereco/,
  );
});

test('rejeita vínculo sem regime de trabalho e sem contrato obrigatório', () => {
  assert.throws(
    () => montarS2200(dadosBase({ vinculo: { ...dadosBase().vinculo, infoRegimeTrab: {} } })),
    /infoCeletista|infoEstatutario/,
  );
  assert.throws(
    () => montarS2200(dadosBase({ vinculo: { ...dadosBase().vinculo, infoContrato: { codCateg: 101, duracao: { tpContr: 1 }, localTrabalho: { localTrabGeral: { tpInsc: 1, nrInsc: '1' } } } } })),
    /vrSalFx/,
  );
});

test('aceita regime estatutário no lugar do celetista', () => {
  const { xml } = montarS2200(
    dadosBase({
      vinculo: {
        ...dadosBase().vinculo,
        tpRegTrab: 2,
        infoRegimeTrab: { infoEstatutario: { tpProv: 1, dtNomeacao: '2026-05-20', dtPosse: '2026-05-25', dtExercicio: '2026-06-01' } },
      },
    }),
    { data: DATA },
  );
  assert.match(xml, /<infoEstatutario><tpProv>1<\/tpProv>/);
  assert.match(xml, /<dtExercicio>2026-06-01<\/dtExercicio>/);
});

test('valida CPF do trabalhador (11 dígitos)', () => {
  assert.throws(() => montarS2200(dadosBase({ trabalhador: { ...dadosBase().trabalhador, cpfTrab: '123' } })), /cpfTrab/);
});

test('S-2200 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2200'], 'function');
});

test('o XML do evtAdmissao é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2200(dadosBase(), { data: DATA });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
