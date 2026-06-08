'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const { montarLote } = require('../esocial/lote/monta-lote');
const { montarS1000 } = require('../esocial/eventos/s1000');
const { assinarEvento } = require('../esocial/assinatura/xmldsig');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');
const { ARQUIVOS_ESPERADOS } = require('../soap/truststore-sectigo');
const {
  ESTADO,
  podeTransicionar,
  transicionar,
  podeEnviar,
  estadoPorCodigoLote,
} = require('../esocial/estado/maquina-estado');
const { envelopeEnviarLote, envelopeConsultarLote, SOAP_NS } = require('../esocial/soap/envelopes');
const { parseRetornoEnvio, parseRetornoConsulta, parseFault } = require('../esocial/soap/respostas');
const { enviarLote, consultarLote } = require('../esocial/operacoes');

const dadosS1000 = {
  tpAmb: 2,
  tpInsc: 1,
  nrInsc: '12345678',
  iniValid: '2026-06',
  infoCadastro: { classTrib: '01' },
};

function eventoAssinado(seq = 1) {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { id, xml } = montarS1000(dadosS1000, {
    data: new Date('2026-06-08T10:00:00'),
    sequencial: seq,
  });
  return { id, xmlAssinado: assinarEvento(xml, { privateKeyPem, leafPem }), material: { leafPem, privateKeyPem } };
}

// ── Lote ─────────────────────────────────────────────────────────────────────
test('montarLote agrupa eventos assinados com grupo e identificadores', () => {
  const ev = eventoAssinado();
  const lote = montarLote({
    grupo: 1,
    ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
    ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
    eventos: [{ id: ev.id, xmlAssinado: ev.xmlAssinado }],
  });
  assert.match(lote, /<envioLoteEventos grupo="1">/);
  assert.match(lote, new RegExp(`<evento Id="${ev.id}">`));
  assert.match(lote, /lote\/eventos\/envio\/v1_1_1/);
});

test('montarLote exige 1..50 eventos e rejeita evento não assinado', () => {
  const base = {
    grupo: 1,
    ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
    ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
  };
  assert.throws(() => montarLote({ ...base, eventos: [] }), /ao menos 1/);
  const muitos = Array.from({ length: 51 }, (_, i) => ({ id: `ID${i}`, xmlAssinado: '<x><Signature/></x>' }));
  assert.throws(() => montarLote({ ...base, eventos: muitos }), /50 eventos/);
  assert.throws(
    () => montarLote({ ...base, eventos: [{ id: 'ID1', xmlAssinado: '<eSocial></eSocial>' }] }),
    /não está assinado/,
  );
});

// ── Máquina de estado ────────────────────────────────────────────────────────
test('transições válidas e inválidas', () => {
  assert.equal(podeTransicionar(ESTADO.RASCUNHO, ESTADO.VALIDADO), true);
  assert.equal(podeTransicionar(ESTADO.ACEITO, ESTADO.RASCUNHO), false);
  assert.equal(transicionar(ESTADO.ENVIADO, ESTADO.ACEITO), ESTADO.ACEITO);
  assert.throws(() => transicionar(ESTADO.RASCUNHO, ESTADO.ACEITO), /Transição inválida/);
});

test('podeEnviar bloqueia o que já está em voo ou aceito (idempotência)', () => {
  assert.equal(podeEnviar(ESTADO.RASCUNHO), true);
  assert.equal(podeEnviar(ESTADO.ASSINADO), true);
  assert.equal(podeEnviar(ESTADO.ENVIADO), false);
  assert.equal(podeEnviar(ESTADO.PROCESSANDO), false);
  assert.equal(podeEnviar(ESTADO.ACEITO), false);
});

test('estadoPorCodigoLote mapeia faixas do retorno', () => {
  assert.equal(estadoPorCodigoLote(201), ESTADO.PROCESSANDO);
  assert.equal(estadoPorCodigoLote(202), ESTADO.PROCESSANDO);
  assert.equal(estadoPorCodigoLote(301), ESTADO.REJEITADO);
});

// ── Envelopes SOAP 1.1 ───────────────────────────────────────────────────────
test('envelope de envio é SOAP 1.1 e embute o lote', () => {
  const env = envelopeEnviarLote('<eSocial xmlns="x"><envioLoteEventos/></eSocial>');
  assert.match(env, new RegExp(SOAP_NS.replace(/[/.]/g, '\\$&')));
  assert.match(env, /<soapenv:Envelope/);
  assert.match(env, /EnviarLoteEventos/);
  assert.match(env, /loteEventos/);
});

test('envelope de consulta exige protocolo e o inclui', () => {
  const env = envelopeConsultarLote('1.2.202606.0000000001');
  assert.match(env, /<protocoloEnvio>1\.2\.202606\.0000000001<\/protocoloEnvio>/);
  assert.throws(() => envelopeConsultarLote(''), /protocolo é obrigatório/);
});

// ── Parser de respostas ──────────────────────────────────────────────────────
test('parseRetornoEnvio extrai protocolo e código', () => {
  const xml = `<eSocial><retornoEnvioLoteEventos><status><cdResposta>201</cdResposta><descResposta>Lote recebido</descResposta></status><dadosRecepcaoLote><protocoloEnvio>1.2.202606.999</protocoloEnvio></dadosRecepcaoLote></retornoEnvioLoteEventos></eSocial>`;
  const r = parseRetornoEnvio(xml);
  assert.equal(r.cdResposta, 201);
  assert.equal(r.descResposta, 'Lote recebido');
  assert.equal(r.protocolo, '1.2.202606.999');
});

test('parseRetornoConsulta extrai recibo e ocorrências', () => {
  const xml = `<eSocial><retornoProcessamentoLoteEventos><status><cdResposta>104</cdResposta></status><evento><retornoEvento><recibo><nrRecibo>1.1.000</nrRecibo></recibo><processamento><ocorrencias><ocorrencia><codigo>1</codigo><descricao>ok</descricao><tipo>1</tipo></ocorrencia></ocorrencias></processamento></retornoEvento></evento></retornoProcessamentoLoteEventos></eSocial>`;
  const r = parseRetornoConsulta(xml);
  assert.equal(r.recibo, '1.1.000');
  assert.equal(r.ocorrencias.length, 1);
  assert.equal(r.ocorrencias[0].descricao, 'ok');
});

test('parseFault detecta soap:Fault', () => {
  const xml = `<soapenv:Envelope xmlns:soapenv="${SOAP_NS}"><soapenv:Body><soapenv:Fault><faultcode>soap:Server</faultcode><faultstring>erro X</faultstring></soapenv:Fault></soapenv:Body></soapenv:Envelope>`;
  const f = parseFault(xml);
  assert.equal(f.faultstring, 'erro X');
  assert.equal(parseFault('<a/>'), null);
});

// ── Operações com https mockado (sem rede) ───────────────────────────────────
function truststoreTemp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-'));
  for (const a of ARQUIVOS_ESPERADOS) {
    fs.writeFileSync(path.join(dir, a.arquivo), '-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----\n');
  }
  return dir;
}

function fakeHttps(respostaXml, status = 200) {
  let capturado = null;
  const mod = {
    Agent: class {
      constructor(opts) {
        this.opts = opts;
      }
    },
    request(options, cb) {
      capturado = { options };
      const req = new EventEmitter();
      req.write = (buf) => {
        capturado.body = buf.toString('utf8');
      };
      req.end = () => {
        const res = new EventEmitter();
        res.statusCode = status;
        res.headers = {};
        cb(res);
        process.nextTick(() => {
          res.emit('data', Buffer.from(respostaXml));
          res.emit('end');
        });
      };
      req.destroy = () => {};
      return req;
    },
    get capturado() {
      return capturado;
    },
  };
  return mod;
}

test('enviarLote monta envelope, usa mTLS e parseia o protocolo', async () => {
  const ev = eventoAssinado();
  const lote = montarLote({
    grupo: 1,
    ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
    ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
    eventos: [{ id: ev.id, xmlAssinado: ev.xmlAssinado }],
  });
  const respostaXml = `<eSocial><status><cdResposta>201</cdResposta></status><dadosRecepcaoLote><protocoloEnvio>1.2.202606.42</protocoloEnvio></dadosRecepcaoLote></eSocial>`;
  const httpsModule = fakeHttps(respostaXml);
  const env = { ESOCIAL_AMBIENTE: '2', SECTIGO_TRUSTSTORE_DIR: truststoreTemp() };

  const r = await enviarLote({ loteXml: lote, material: ev.material, env, httpsModule });
  assert.equal(r.protocolo, '1.2.202606.42');
  // foi para o endpoint de produção restrita
  assert.match(httpsModule.capturado.options.hostname, /producaorestrita\.esocial\.gov\.br/);
  // o agente recebeu cert e key (mTLS)
  // (Agent armazenou as opts)
});

test('consultarLote envia protocolo e interpreta recibo', async () => {
  const ev = eventoAssinado();
  const respostaXml = `<eSocial><status><cdResposta>104</cdResposta></status><evento><retornoEvento><recibo><nrRecibo>1.1.777</nrRecibo></recibo></retornoEvento></evento></eSocial>`;
  const httpsModule = fakeHttps(respostaXml);
  const env = { ESOCIAL_AMBIENTE: '2', SECTIGO_TRUSTSTORE_DIR: truststoreTemp() };

  const r = await consultarLote({ protocolo: '1.2.202606.42', material: ev.material, env, httpsModule });
  assert.equal(r.recibo, '1.1.777');
  assert.match(httpsModule.capturado.body, /<protocoloEnvio>1\.2\.202606\.42<\/protocoloEnvio>/);
});

test('operação propaga soap:Fault como erro', async () => {
  const ev = eventoAssinado();
  const faultXml = `<soapenv:Envelope xmlns:soapenv="${SOAP_NS}"><soapenv:Body><soapenv:Fault><faultstring>indisponível</faultstring></soapenv:Fault></soapenv:Body></soapenv:Envelope>`;
  const httpsModule = fakeHttps(faultXml, 500);
  const env = { ESOCIAL_AMBIENTE: '2', SECTIGO_TRUSTSTORE_DIR: truststoreTemp() };
  await assert.rejects(
    () => consultarLote({ protocolo: 'x', material: ev.material, env, httpsModule }),
    /SOAP Fault: indisponível/,
  );
});

test('cliente SOAP aborta se a cadeia Sectigo não estiver instalada (estrito)', async () => {
  const ev = eventoAssinado();
  const httpsModule = fakeHttps('<a/>');
  const env = { ESOCIAL_AMBIENTE: '2', SECTIGO_TRUSTSTORE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'vazio-')) };
  await assert.rejects(
    () => enviarLote({ loteXml: '<eSocial/>', material: ev.material, env, httpsModule }),
    /Trust store Sectigo incompleto/,
  );
});
