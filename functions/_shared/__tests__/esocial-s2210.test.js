'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarS2210 } = require('../esocial/eventos/sst/s2210');
const { assinarEvento, verificarAssinatura } = require('../esocial/assinatura/xmldsig');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');
const { MONTADORES } = require('../esocial/transmissao');

// ── dados base de um acidente típico (HOMOLOGAÇÃO, tpAmb=2) ───────────────────
function dadosBase(over = {}) {
  return {
    tpAmb: 2,
    tpInsc: 1,
    nrInsc: '12345678000199',
    ideVinculo: { cpfTrab: '12345678909', matricula: 'M-001' },
    cat: {
      dtAcid: '2026-06-08',
      tpAcid: '0',
      hrAcid: '0830',
      hrsTrabAntesAcid: '0200',
      tpCat: 1,
      indComunPolicia: 'N',
      codSitGeradora: '310030500',
      iniciatCAT: 1,
      ultDiaTrab: '2026-06-08',
      houveAfast: 'S',
      localAcidente: {
        tpLocal: 1,
        dscLograd: 'Rua das Indústrias, 100',
        codMunic: '3550308',
        uf: 'SP',
      },
      partesAtingidas: [{ codParteAting: '753050000', lateralidade: 1 }],
      agentesCausadores: [{ codAgntCausador: '301010000' }],
    },
    ...over,
  };
}

const DATA = new Date('2026-06-09T10:00:00');

// ── Montagem básica ──────────────────────────────────────────────────────────
test('montarS2210 gera XML bem-formado com namespace evtCAT da S-1.3', () => {
  const { xml, id, alias } = montarS2210(dadosBase(), { data: DATA });
  assert.equal(alias, 'evtCAT');
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtCAT\/v_S_01_03_00">/);
  assert.match(xml, /<evtCAT Id="ID1/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<tpAmb>2<\/tpAmb>/);
  assert.match(xml, /<cpfTrab>12345678909<\/cpfTrab>/);
  assert.match(xml, /<dtAcid>2026-06-08<\/dtAcid>/);
  assert.match(xml, /<tpCat>1<\/tpCat>/);
});

test('Id usa o CNPJ completo (14) do empregador e tem 36 chars', () => {
  const { id } = montarS2210(dadosBase(), { data: DATA });
  assert.equal(id.length, 36);
  assert.equal(id, 'ID112345678000199' + '20260609100000' + '00001');
});

test('parteAtingida e agenteCausador suportam 1..N', () => {
  const { xml } = montarS2210(
    dadosBase({
      cat: {
        ...dadosBase().cat,
        partesAtingidas: [
          { codParteAting: '753050000', lateralidade: 1 },
          { codParteAting: '755010000', lateralidade: 2 },
        ],
        agentesCausadores: [
          { codAgntCausador: '301010000' },
          { codAgntCausador: '302010000' },
        ],
      },
    }),
    { data: DATA },
  );
  assert.equal((xml.match(/<parteAtingida>/g) || []).length, 2);
  assert.equal((xml.match(/<agenteCausador>/g) || []).length, 2);
  assert.match(xml, /<codParteAting>755010000<\/codParteAting>/);
});

test('campos opcionais ausentes não aparecem no XML', () => {
  const { xml } = montarS2210(dadosBase(), { data: DATA });
  assert.doesNotMatch(xml, /nrRecibo/); // não é retificação
  assert.doesNotMatch(xml, /indCatObito/); // não é óbito
  assert.doesNotMatch(xml, /<atestado>/); // sem atestado
  assert.doesNotMatch(xml, /ideLocalAcid/); // local é do próprio empregador
});

test('atestado é incluído com emitente quando fornecido', () => {
  const { xml } = montarS2210(
    dadosBase({
      cat: {
        ...dadosBase().cat,
        atestado: {
          dtAtendimento: '2026-06-08',
          hrAtendimento: '0930',
          indInternacao: 'N',
          durTrat: 15,
          indAfast: 'S',
          dscLesao: '701',
          codCID: 'S610',
          emitente: { nmEmit: 'Dr. House', ideOC: 1, nrOC: '12345', ufOC: 'SP' },
        },
      },
    }),
    { data: DATA },
  );
  assert.match(xml, /<atestado>/);
  assert.match(xml, /<codCID>S610<\/codCID>/);
  assert.match(xml, /<nmEmit>Dr\. House<\/nmEmit>/);
  assert.match(xml, /<ideOC>1<\/ideOC>/);
});

test('escapa caracteres especiais em texto livre (obsCAT)', () => {
  const { xml } = montarS2210(
    dadosBase({ cat: { ...dadosBase().cat, obsCAT: 'Queda < 2m & escada' } }),
    { data: DATA },
  );
  assert.match(xml, /<obsCAT>Queda &lt; 2m &amp; escada<\/obsCAT>/);
});

// ── Regras de negócio ────────────────────────────────────────────────────────
test('óbito (tpCat=3) exige indCatObito=S e dtObito', () => {
  assert.throws(
    () => montarS2210(dadosBase({ cat: { ...dadosBase().cat, tpCat: 3 } }), { data: DATA }),
    /indCatObito|dtObito/,
  );
  // com os campos de óbito presentes, monta normalmente.
  const { xml } = montarS2210(
    dadosBase({ cat: { ...dadosBase().cat, tpCat: 3, indCatObito: 'S', dtObito: '2026-06-08' } }),
    { data: DATA },
  );
  assert.match(xml, /<tpCat>3<\/tpCat>/);
  assert.match(xml, /<indCatObito>S<\/indCatObito>/);
  assert.match(xml, /<dtObito>2026-06-08<\/dtObito>/);
});

test('retificação (indRetif=2) exige nrRecibo e o emite', () => {
  assert.throws(
    () => montarS2210(dadosBase({ indRetif: 2 }), { data: DATA }),
    /nrRecibo/,
  );
  const { xml } = montarS2210(dadosBase({ indRetif: 2, nrRecibo: '1.2.3' }), { data: DATA });
  assert.match(xml, /<indRetif>2<\/indRetif>/);
  assert.match(xml, /<nrRecibo>1\.2\.3<\/nrRecibo>/);
});

test('exige ao menos uma parte atingida e um agente causador', () => {
  assert.throws(
    () => montarS2210(dadosBase({ cat: { ...dadosBase().cat, partesAtingidas: [] } }), { data: DATA }),
    /partesAtingidas/,
  );
  assert.throws(
    () => montarS2210(dadosBase({ cat: { ...dadosBase().cat, agentesCausadores: [] } }), { data: DATA }),
    /agentesCausadores/,
  );
});

test('valida CPF do trabalhador e UF do local', () => {
  assert.throws(
    () => montarS2210(dadosBase({ ideVinculo: { cpfTrab: '123' } }), { data: DATA }),
    /cpfTrab/,
  );
  assert.throws(
    () =>
      montarS2210(
        dadosBase({ cat: { ...dadosBase().cat, localAcidente: { tpLocal: 1, codMunic: '3550308', uf: 'São Paulo' } } }),
        { data: DATA },
      ),
    /uf/,
  );
});

// ── Integração com o encanamento existente (registro + assinatura) ───────────
test('S-2210 está registrado no MONTADORES da transmissão', () => {
  assert.equal(typeof MONTADORES['S-2210'], 'function');
});

test('o XML do evtCAT é assinável e a assinatura verifica', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS2210(dadosBase(), { data: DATA });

  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });
  assert.match(assinado, /<(\w+:)?Signature/);
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});
