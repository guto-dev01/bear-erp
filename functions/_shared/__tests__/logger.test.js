'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { redagir, mascararCpf, mascararPis } = require('../log/logger');

test('mascararCpf preserva 3 primeiros e 2 últimos dígitos', () => {
  assert.equal(mascararCpf('123.456.789-09'), '123******09');
  assert.equal(mascararCpf('12345678909'), '123******09');
});

test('mascararPis mascara NIS/PIS (11 dígitos: 3 + 6 estrelas + 2)', () => {
  assert.equal(mascararPis('120.12345.67-8'), '120******78');
  assert.equal(mascararPis('12012345678'), '120******78');
});

test('redagir oculta segredos por nome de chave', () => {
  const r = redagir({
    senha: 'super-secreta',
    password: 'x',
    certificadoSenha: 'y',
    pfx: Buffer.from('binario'),
    privateKeyPem: 'KEY',
    apiKey: 'k',
    token: 't',
    nome: 'visível',
  });
  assert.equal(r.senha, '[REDACTED]');
  assert.equal(r.password, '[REDACTED]');
  assert.equal(r.certificadoSenha, '[REDACTED]');
  assert.equal(r.privateKeyPem, '[REDACTED]');
  assert.equal(r.apiKey, '[REDACTED]');
  assert.equal(r.token, '[REDACTED]');
  assert.equal(r.nome, 'visível');
});

test('redagir mascara cpf/pis aninhados e Buffers viram resumo', () => {
  const r = redagir({
    funcionario: { cpf: '12345678909', pis: '12012345678', nome: 'Maria' },
    anexo: Buffer.alloc(10),
  });
  assert.equal(r.funcionario.cpf, '123******09');
  assert.equal(r.funcionario.nome, 'Maria');
  assert.match(r.anexo, /^\[Buffer 10b\]$/);
});

test('redagir lida com arrays e profundidade sem quebrar', () => {
  const r = redagir({ lista: [{ senha: 'a' }, { ok: 1 }] });
  assert.equal(r.lista[0].senha, '[REDACTED]');
  assert.equal(r.lista[1].ok, 1);
});
