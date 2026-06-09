'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const { transmitirLote, atualizarPorConsulta } = require('../esocial/transmissao');
const { MemoriaEventosRepo } = require('../esocial/repositorio');
const { MemoriaVault } = require('../cofre/memoria-vault');
const { ESTADO } = require('../esocial/estado/maquina-estado');
const { ARQUIVOS_ESPERADOS } = require('../soap/truststore-sectigo');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

function truststoreTemp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-'));
  for (const a of ARQUIVOS_ESPERADOS) {
    fs.writeFileSync(path.join(dir, a.arquivo), '-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----\n');
  }
  return dir;
}

function fakeHttps(respostaXml, status = 200) {
  return {
    Agent: class {
      constructor(opts) {
        this.opts = opts;
      }
    },
    request(_options, cb) {
      const req = new EventEmitter();
      req.write = () => {};
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
  };
}

const ENV = () => ({ ESOCIAL_AMBIENTE: '2', SECTIGO_TRUSTSTORE_DIR: truststoreTemp() });

const eventoS1000 = {
  eventoId: 'doc1',
  tipoEvento: 'S-1000',
  dados: {
    tpAmb: 2,
    tpInsc: 1,
    nrInsc: '12345678',
    iniValid: '2026-06',
    infoCadastro: { classTrib: '01' },
  },
};

function cofreComCert() {
  const { pfx, senha } = gerarPfxTeste();
  return new MemoriaVault().registrar('emp1', { pfx, senha });
}

test('transmitirLote: monta, assina, envia e persiste protocolo + ENVIADO', async () => {
  const repo = new MemoriaEventosRepo({ doc1: { $id: 'doc1', status: ESTADO.VALIDADO } });
  const cofre = cofreComCert();
  const respostaXml =
    '<eSocial><status><cdResposta>201</cdResposta></status><dadosRecepcaoLote><protocoloEnvio>1.2.202606.55</protocoloEnvio></dadosRecepcaoLote></eSocial>';

  const r = await transmitirLote({
    repo,
    cofre,
    empresaId: 'emp1',
    grupo: 1,
    ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
    ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
    eventos: [eventoS1000],
    env: ENV(),
    httpsModule: fakeHttps(respostaXml),
  });

  assert.equal(r.protocolo, '1.2.202606.55');
  const doc = await repo.obter('doc1');
  assert.equal(doc.status, ESTADO.ENVIADO);
  assert.equal(doc.protocolo, '1.2.202606.55');
  assert.equal(doc.ambiente, 2);
  assert.equal(doc.versaoLeiaute, 'S-1.3');
  assert.match(doc.idEvento, /^ID1/);
  assert.match(doc.payloadXml, /Signature/);
});

test('transmitirLote bloqueia evento já em voo (idempotência)', async () => {
  const repo = new MemoriaEventosRepo();
  const cofre = cofreComCert();
  await assert.rejects(
    () =>
      transmitirLote({
        repo,
        cofre,
        empresaId: 'emp1',
        grupo: 1,
        ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
        ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
        eventos: [{ ...eventoS1000, statusAtual: ESTADO.ENVIADO }],
        env: ENV(),
        httpsModule: fakeHttps('<a/>'),
      }),
    /não pode ser reenviado/,
  );
});

test('transmitirLote marca ERRO e preserva contexto em falha de transporte', async () => {
  const repo = new MemoriaEventosRepo({ doc1: { $id: 'doc1', status: ESTADO.VALIDADO } });
  const cofre = cofreComCert();
  const httpsQuebra = {
    Agent: class {},
    request() {
      const req = new EventEmitter();
      req.write = () => {};
      req.end = () => process.nextTick(() => req.emit('error', new Error('conexão recusada')));
      req.destroy = () => {};
      return req;
    },
  };
  await assert.rejects(
    () =>
      transmitirLote({
        repo,
        cofre,
        empresaId: 'emp1',
        grupo: 1,
        ideEmpregador: { tpInsc: 1, nrInsc: '12345678000199' },
        ideTransmissor: { tpInsc: 1, nrInsc: '12345678000199' },
        eventos: [eventoS1000],
        env: ENV(),
        httpsModule: httpsQuebra,
      }),
    /conexão recusada/,
  );
  const doc = await repo.obter('doc1');
  assert.equal(doc.status, ESTADO.ERRO);
  assert.match(doc.erros, /conexão recusada/);
});

test('atualizarPorConsulta marca ACEITO quando há recibo', async () => {
  const repo = new MemoriaEventosRepo({ doc1: { $id: 'doc1', status: ESTADO.ENVIADO } });
  const cofre = cofreComCert();
  const respostaXml =
    '<eSocial><status><cdResposta>104</cdResposta></status><evento><retornoEvento><recibo><nrRecibo>1.1.999</nrRecibo></recibo></retornoEvento></evento></eSocial>';

  const r = await atualizarPorConsulta({
    repo,
    cofre,
    empresaId: 'emp1',
    protocolo: '1.2.202606.55',
    eventoIds: ['doc1'],
    env: ENV(),
    httpsModule: fakeHttps(respostaXml),
  });

  assert.equal(r.status, ESTADO.ACEITO);
  assert.equal(r.recibo, '1.1.999');
  const doc = await repo.obter('doc1');
  assert.equal(doc.status, ESTADO.ACEITO);
  assert.equal(doc.recibo, '1.1.999');
});

test('atualizarPorConsulta marca REJEITADO com ocorrências', async () => {
  const repo = new MemoriaEventosRepo({ doc1: { $id: 'doc1', status: ESTADO.ENVIADO } });
  const cofre = cofreComCert();
  const respostaXml =
    '<eSocial><status><cdResposta>301</cdResposta></status><evento><retornoEvento><processamento><ocorrencias><ocorrencia><codigo>1010</codigo><descricao>campo inválido</descricao><tipo>1</tipo></ocorrencia></ocorrencias></processamento></retornoEvento></evento></eSocial>';

  const r = await atualizarPorConsulta({
    repo,
    cofre,
    empresaId: 'emp1',
    protocolo: 'x',
    eventoIds: ['doc1'],
    env: ENV(),
    httpsModule: fakeHttps(respostaXml),
  });

  assert.equal(r.status, ESTADO.REJEITADO);
  const doc = await repo.obter('doc1');
  assert.equal(doc.status, ESTADO.REJEITADO);
  assert.match(doc.erros, /campo inválido/);
});
