'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { transmitirNfe, statusServico } = require('../nfe/transmissao');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

const CHAVE = '35260512345678000199550010000010011000070203';
const NFE = `<?xml version="1.0"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
  `<infNFe Id="NFe${CHAVE}" versao="4.00"><ide><cUF>35</cUF><nNF>1001</nNF></ide></infNFe></NFe>`;

const RET_AUTORIZADA =
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
  '<retEnviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
  '<tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo>' +
  '<protNFe><infProt><nProt>135260000012345</nProt>' +
  `<chNFe>${CHAVE}</chNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo>` +
  '</infProt></protNFe></retEnviNFe></soap:Body></soap:Envelope>';

const RET_STATUS_ONLINE =
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
  '<retConsStatServ versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
  '<tpAmb>2</tpAmb><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo></retConsStatServ>' +
  '</soap:Body></soap:Envelope>';

/** https falso: captura o que foi enviado e devolve uma resposta canned. */
function fakeHttps(responseBody, captura) {
  return {
    Agent: class {
      constructor(opts) { captura.agentOpts = opts; }
    },
    request(options, cb) {
      captura.options = options;
      const req = new EventEmitter();
      req.write = (buf) => { captura.body = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf); };
      req.end = () => {
        const res = new EventEmitter();
        res.statusCode = 200;
        res.headers = {};
        cb(res);
        process.nextTick(() => {
          res.emit('data', Buffer.from(responseBody, 'utf8'));
          res.emit('end');
        });
      };
      req.destroy = () => {};
      return req;
    },
  };
}

function cofreTeste() {
  const { pfx, senha } = gerarPfxTeste();
  return { carregar: async () => ({ pfx, senha }) };
}

test('transmitirNfe assina, envia ao endpoint da UF e interpreta autorização', async () => {
  const captura = {};
  const r = await transmitirNfe({
    cofre: cofreTeste(),
    empresaId: 'emp-1',
    uf: 'SP',
    xmlNFe: NFE,
    ambiente: 'homologacao',
    truststoreEstrito: false,
    httpsModule: fakeHttps(RET_AUTORIZADA, captura),
  });

  // Resultado interpretado
  assert.equal(r.situacao, 'AUTORIZADA');
  assert.equal(r.cStat, 100);
  assert.equal(r.nProt, '135260000012345');
  assert.equal(r.url, 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');

  // Foi mesmo para o host de SP homologação
  assert.equal(captura.options.hostname, 'homologacao.nfe.fazenda.sp.gov.br');
  assert.equal(captura.options.path, '/ws/nfeautorizacao4.asmx');

  // O corpo enviado contém a NF-e assinada dentro de um enviNFe
  assert.ok(/<(\w+:)?Signature[ >]/.test(captura.body), 'corpo enviado está assinado');
  assert.ok(captura.body.includes('<enviNFe'), 'corpo enviado tem enviNFe');
  assert.ok(captura.body.includes('nfeDadosMsg'), 'corpo enviado é o nfeDadosMsg');
});

test('transmitirNfe falha para UF sem endpoint mapeado (lacuna)', async () => {
  await assert.rejects(
    () => transmitirNfe({ cofre: cofreTeste(), empresaId: 'e', uf: 'AM', xmlNFe: NFE, httpsModule: fakeHttps('', {}) }),
    /Sem endpoint NFeAutorizacao4 para UF AM/,
  );
});

test('statusServico faz o "ping" e detecta serviço online', async () => {
  const captura = {};
  const r = await statusServico({
    cofre: cofreTeste(),
    empresaId: 'emp-1',
    uf: 'SP',
    ambiente: 'homologacao',
    truststoreEstrito: false,
    httpsModule: fakeHttps(RET_STATUS_ONLINE, captura),
  });
  assert.equal(r.online, true);
  assert.equal(r.cStat, 107);
  assert.ok(captura.body.includes('<xServ>STATUS</xServ>'), 'enviou consStatServ');
  assert.equal(captura.options.hostname, 'homologacao.nfe.fazenda.sp.gov.br');

  // SOAP 1.2 (a SEFAZ rejeita 1.1 com "Possible SOAP version mismatch"):
  // envelope 2003/05, Content-Type application/soap+xml com action embutido
  // e SEM header SOAPAction.
  assert.ok(captura.body.includes('xmlns:soap="http://www.w3.org/2003/05/soap-envelope"'), 'envelope SOAP 1.2');
  const ct = captura.options.headers['Content-Type'];
  assert.match(ct, /^application\/soap\+xml/, 'Content-Type do SOAP 1.2');
  assert.ok(ct.includes('action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4"'), 'action embutido no Content-Type');
  assert.equal(captura.options.headers.SOAPAction, undefined, 'SOAP 1.2 não usa header SOAPAction');
});

test('sefaz-ca.pem fecha a cadeia numa raiz autoassinada (ICP-Brasil v10)', () => {
  // O OpenSSL/Node não aceita âncora parcial: a cadeia do servidor da SEFAZ
  // (folha → AC SOLUTI SSL EV G4) precisa FECHAR numa raiz autoassinada do
  // truststore. Só a intermediária no bundle → "unable to get issuer certificate".
  const { X509Certificate } = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const pem = fs.readFileSync(
    path.join(__dirname, '..', '..', 'nfe-transmissao', 'certs', 'sefaz-ca.pem'), 'utf8');
  const blocos = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
  const certs = blocos.map((b) => new X509Certificate(b));
  assert.ok(certs.length >= 2, `bundle tem intermediária + raiz (recebido ${certs.length})`);

  const raiz = certs.find((c) => c.subject === c.issuer);
  assert.ok(raiz, 'bundle contém uma raiz autoassinada');
  assert.ok(raiz.verify(raiz.publicKey), 'raiz é de fato autoassinada (assinatura própria confere)');
  assert.match(raiz.subject, /Autoridade Certificadora Raiz Brasileira v10/);
  assert.ok(new Date(raiz.validTo) > new Date(), 'raiz dentro da validade');

  const intermediaria = certs.find((c) => c !== raiz);
  assert.ok(intermediaria.verify(raiz.publicKey), 'intermediária é emitida pela raiz do bundle');
  assert.match(intermediaria.subject, /AC SOLUTI SSL EV G4/);
});
