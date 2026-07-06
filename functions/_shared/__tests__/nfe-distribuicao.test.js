'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const zlib = require('node:zlib');

const { montarDistDFeInt, envelopeDistribuicao, WSDL } = require('../nfe/soap');
const { montarEventoManifestacao, MANIFESTACAO } = require('../nfe/eventos');
const { assinarElemento, verificarAssinatura } = require('../nfe/assinatura');
const { parseRetornoDistribuicao, parseRetornoEvento } = require('../nfe/respostas');
const { baixarDistribuicao, baixarNovos, manifestarDestinatario, dhAgora } = require('../nfe/importacao');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';
const CHAVE = '35260512345678000199550010000010011000070203';
const CNPJ = '12345678000199';

// ── helpers ──────────────────────────────────────────────────────────────
function gz(xml) {
  return zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
}
const resumo = (n) =>
  `<resNFe xmlns="${NFE_NS}" versao="1.01"><chNFe>${CHAVE}</chNFe><CNPJ>${CNPJ}</CNPJ>` +
  `<xNome>FORNECEDOR ${n}</xNome><vNF>${n}0.00</vNF><tpNF>1</tpNF><cSitNFe>1</cSitNFe></resNFe>`;

function retDist({ cStat, ultNSU, maxNSU, docs = [] }) {
  const lote = docs.map((d) => `<docZip NSU="${d.nsu}" schema="${d.schema}">${d.b64}</docZip>`).join('');
  return (
    '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
    `<retDistDFeInt xmlns="${NFE_NS}" versao="1.35"><tpAmb>2</tpAmb><cStat>${cStat}</cStat>` +
    `<xMotivo>x</xMotivo><dhResp>2026-07-01T10:00:00-03:00</dhResp>` +
    `<ultNSU>${ultNSU}</ultNSU><maxNSU>${maxNSU}</maxNSU>` +
    (lote ? `<loteDistDFeInt>${lote}</loteDistDFeInt>` : '') +
    '</retDistDFeInt></soap:Body></soap:Envelope>'
  );
}

const RET_EVENTO_OK =
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
  `<retEnvEvento versao="1.00" xmlns="${NFE_NS}"><idLote>1</idLote><cStat>128</cStat><xMotivo>Lote de Evento Processado</xMotivo>` +
  '<retEvento versao="1.00"><infEvento><cOrgao>91</cOrgao><cStat>135</cStat>' +
  '<xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>891260000012345</nProt>' +
  '<dhRegEvento>2026-07-01T10:00:05-03:00</dhRegEvento></infEvento></retEvento>' +
  '</retEnvEvento></soap:Body></soap:Envelope>';

/** https falso com FILA de respostas (uma por chamada) — exercita o loop de NSU. */
function fakeHttpsSeq(respostas, capturas) {
  let i = 0;
  return {
    Agent: class { constructor(o) { this.o = o; capturas.agentOpts = o; } },
    request(options, cb) {
      const cap = { options };
      const body = respostas[Math.min(i, respostas.length - 1)];
      i += 1;
      const req = new EventEmitter();
      req.write = (buf) => { cap.body = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf); capturas.push(cap); };
      req.end = () => {
        const res = new EventEmitter();
        res.statusCode = 200; res.headers = {};
        cb(res);
        process.nextTick(() => { res.emit('data', Buffer.from(body, 'utf8')); res.emit('end'); });
      };
      req.destroy = () => {};
      return req;
    },
  };
}

function cofreTeste() {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE:${CNPJ}` });
  return { carregar: async () => ({ pfx, senha }) };
}

// ── distDFeInt (mensagem) ──────────────────────────────────────────────────
test('montarDistDFeInt: distNSU / consNSU / consChNFe e NSU com 15 dígitos', () => {
  const porNsu = montarDistDFeInt({ tpAmb: '1', cUFAutor: '35', cnpjCpf: CNPJ, ultNSU: 7 });
  assert.ok(porNsu.includes('<distNSU><ultNSU>000000000000007</ultNSU></distNSU>'));
  assert.ok(porNsu.includes(`<CNPJ>${CNPJ}</CNPJ>`) && porNsu.includes('versao="1.35"'));

  const umNsu = montarDistDFeInt({ tpAmb: '2', cUFAutor: '35', cnpjCpf: CNPJ, nsu: 42 });
  assert.ok(umNsu.includes('<consNSU><NSU>000000000000042</NSU></consNSU>'));

  const porChave = montarDistDFeInt({ tpAmb: '1', cUFAutor: '35', cnpjCpf: CNPJ, chNFe: CHAVE });
  assert.ok(porChave.includes(`<consChNFe><chNFe>${CHAVE}</chNFe></consChNFe>`));
});

test('envelopeDistribuicao: wrapper nfeDistDFeInteresse + nfeDadosMsg e SOAPAction da operação', () => {
  const { xmlEnvelope, soapAction } = envelopeDistribuicao(
    montarDistDFeInt({ tpAmb: '2', cUFAutor: '35', cnpjCpf: CNPJ, ultNSU: 0 }),
  );
  assert.ok(xmlEnvelope.includes('<nfeDistDFeInteresse'));
  assert.ok(xmlEnvelope.includes('<nfeDadosMsg><distDFeInt'));
  assert.equal(soapAction, `${WSDL.NFeDistribuicaoDFe}/nfeDistDFeInteresse`);
});

// ── retorno (parse + gunzip) ────────────────────────────────────────────────
test('parseRetornoDistribuicao descompacta docZip e sinaliza temMais', () => {
  const xml = retDist({
    cStat: 138, ultNSU: '000000000000002', maxNSU: '000000000000009',
    docs: [
      { nsu: '000000000000001', schema: 'resNFe_v1.01.xsd', b64: gz(resumo(1)) },
      { nsu: '000000000000002', schema: 'resNFe_v1.01.xsd', b64: gz(resumo(2)) },
    ],
  });
  const r = parseRetornoDistribuicao(xml);
  assert.equal(r.cStat, 138);
  assert.equal(r.ultNSU, '000000000000002');
  assert.equal(r.maxNSU, '000000000000009');
  assert.equal(r.temMais, true);
  assert.equal(r.documentos.length, 2);
  assert.equal(r.documentos[0].tipo, 'resNFe');
  assert.ok(r.documentos[0].xml.includes('FORNECEDOR 1'), 'docZip 1 descompactado');
  assert.ok(r.documentos[1].xml.includes('FORNECEDOR 2'), 'docZip 2 descompactado');
});

// ── manifestação (evento) ──────────────────────────────────────────────────
test('montarEventoManifestacao: 4 tipos, cOrgao 91 e descrição correta', () => {
  for (const [tp, desc] of Object.entries(MANIFESTACAO)) {
    const xJust = tp === '210240' ? 'Operacao nao realizada conforme combinado' : undefined;
    const xml = montarEventoManifestacao({ chave: CHAVE, cnpj: CNPJ, tpEvento: tp, xJust, dhEvento: '2026-07-01T10:00:00-03:00' });
    assert.ok(xml.includes(`<infEvento Id="ID${tp}${CHAVE}01">`), `Id do ${tp}`);
    assert.ok(xml.includes('<cOrgao>91</cOrgao>'), 'cOrgao 91 (Ambiente Nacional)');
    assert.ok(xml.includes(`<descEvento>${desc}</descEvento>`));
  }
});

test('montarEventoManifestacao: 210240 exige xJust; demais recusam xJust', () => {
  assert.throws(() => montarEventoManifestacao({ chave: CHAVE, cnpj: CNPJ, tpEvento: '210240', dhEvento: 'x' }));
  assert.throws(() => montarEventoManifestacao({ chave: CHAVE, cnpj: CNPJ, tpEvento: '210210', xJust: 'nao vale aqui mesmo', dhEvento: 'x' }));
  assert.throws(() => montarEventoManifestacao({ chave: CHAVE, cnpj: CNPJ, tpEvento: '999999', dhEvento: 'x' }));
});

test('assinatura do evento de manifestação (infEvento) é válida', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { lerPkcs12 } = require('../certificado/pkcs12');
  const mat = lerPkcs12(pfx, senha);
  const ev = montarEventoManifestacao({ chave: CHAVE, cnpj: CNPJ, tpEvento: '210210', dhEvento: '2026-07-01T10:00:00-03:00' });
  const assinado = assinarElemento(ev, 'infEvento', mat);
  assert.ok(assinado.includes(`URI="#ID210210${CHAVE}01"`), 'Reference aponta p/ o @Id do infEvento');
  assert.equal(verificarAssinatura(assinado, mat.leafPem), true);
});

test('parseRetornoEvento reconhece registro (cStat 135)', () => {
  const r = parseRetornoEvento(RET_EVENTO_OK);
  assert.equal(r.cStat, 135);
  assert.equal(r.registrado, true);
  assert.equal(r.nProt, '891260000012345');
});

// ── orquestrador (integração sem rede) ──────────────────────────────────────
test('baixarNovos itera o NSU até ultNSU>=maxNSU e acumula documentos', async () => {
  const capturas = [];
  // 1ª chamada: 2 docs, ainda faltam (ult 2 < max 3). 2ª: 1 doc, chega no fim (ult 3 = max 3).
  const respostas = [
    retDist({ cStat: 138, ultNSU: '000000000000002', maxNSU: '000000000000003',
      docs: [
        { nsu: '000000000000001', schema: 'resNFe_v1.01.xsd', b64: gz(resumo(1)) },
        { nsu: '000000000000002', schema: 'procNFe_v4.00.xsd', b64: gz(resumo(2)) },
      ] }),
    retDist({ cStat: 138, ultNSU: '000000000000003', maxNSU: '000000000000003',
      docs: [{ nsu: '000000000000003', schema: 'resNFe_v1.01.xsd', b64: gz(resumo(3)) }] }),
  ];

  const r = await baixarNovos({
    cofre: cofreTeste(), empresaId: 'emp-1', uf: 'SP', ambiente: 'homologacao',
    truststoreEstrito: false, ultNSU: '0', httpsModule: fakeHttpsSeq(respostas, capturas),
  });

  assert.equal(r.documentos.length, 3, 'acumulou os 3 documentos das 2 páginas');
  assert.equal(r.ultNSU, '000000000000003');
  assert.equal(r.maxNSU, '000000000000003');
  assert.equal(capturas.length, 2, 'fez exatamente 2 consultas (parou ao alcançar o maxNSU)');
  // foi ao Ambiente Nacional de homologação
  assert.equal(capturas[0].options.hostname, 'hom1.nfe.fazenda.gov.br');
  assert.ok(capturas[0].body.includes('<distNSU><ultNSU>000000000000000</ultNSU>'), '1ª consulta parte do NSU 0');
  assert.ok(capturas[1].body.includes('<distNSU><ultNSU>000000000000002</ultNSU>'), '2ª consulta continua do NSU 2');
});

test('baixarNovos aborta em consumo indevido (cStat 656)', async () => {
  const capturas = [];
  const respostas = [retDist({ cStat: 656, ultNSU: '0', maxNSU: '0' })];
  await assert.rejects(
    () => baixarNovos({ cofre: cofreTeste(), empresaId: 'e', uf: 'SP', truststoreEstrito: false, httpsModule: fakeHttpsSeq(respostas, capturas) }),
    /Consumo indevido/,
  );
});

test('manifestarDestinatario assina, envia ao RecepcaoEvento do AN e interpreta registro', async () => {
  const capturas = [];
  const r = await manifestarDestinatario({
    cofre: cofreTeste(), empresaId: 'emp-1', chave: CHAVE, tpEvento: '210210',
    ambiente: 'homologacao', truststoreEstrito: false, httpsModule: fakeHttpsSeq([RET_EVENTO_OK], capturas),
  });
  assert.equal(r.registrado, true);
  assert.equal(r.cStat, 135);
  assert.equal(capturas[0].options.hostname, 'hom.nfe.fazenda.gov.br', 'foi para o AN (não para a UF)');
  assert.ok(/<(\w+:)?Signature[ >]/.test(capturas[0].body), 'evento enviado está assinado');
  assert.ok(capturas[0].body.includes('<tpEvento>210210</tpEvento>'));
  assert.ok(capturas[0].body.includes('<cOrgao>91</cOrgao>'));
});

test('dhAgora devolve ISO com fuso -03:00', () => {
  assert.match(dhAgora(new Date('2026-07-01T13:00:00Z')), /^2026-07-01T10:00:00-03:00$/);
});

test('distribuição confia na CA do AN (SERPRO an-ca.pem) + raízes públicas no Agent', async () => {
  const capturas = [];
  await baixarDistribuicao({
    cofre: cofreTeste(), empresaId: 'e', uf: 'SP', ambiente: 'homologacao',
    truststoreEstrito: false, httpsModule: fakeHttpsSeq([retDist({ cStat: 137, ultNSU: '0', maxNSU: '0' })], capturas),
  });
  const ca = capturas.agentOpts.ca;
  assert.ok(Array.isArray(ca), 'passou lista de CA ao Agent');
  // rootCertificates do Node tem >100 entradas (cobre Let's Encrypt da manifestação).
  assert.ok(ca.length > 100, `inclui raízes públicas (recebido ${ca.length})`);
  // e contém a intermediária SERPRO (an-ca.pem) como âncora extra.
  assert.ok(ca.some(c => String(c).includes('BEGIN CERTIFICATE')), 'contém PEM(s)');
  assert.ok(ca.length > require('node:tls').rootCertificates.length, 'tem CA extra além das raízes (SERPRO)');
});
