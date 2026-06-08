'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { lerPkcs12, extrairCnpjCpf, extrairTitular } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

test('lerPkcs12 extrai folha, chave e metadados do .pfx', () => {
  const { pfx, senha } = gerarPfxTeste({ cn: 'EMPRESA TESTE LTDA:12345678000199' });
  const r = lerPkcs12(pfx, senha);

  assert.match(r.leafPem, /-----BEGIN CERTIFICATE-----/);
  assert.match(r.privateKeyPem, /-----BEGIN RSA PRIVATE KEY-----/);
  assert.equal(r.titular, 'EMPRESA TESTE LTDA');
  assert.equal(r.cnpjCpf, '12345678000199');
  assert.equal(r.emissor, 'AC TESTE ICP-BRASIL');
  assert.ok(r.validoAte instanceof Date);
  assert.ok(r.validoAte > r.validoDe);
});

test('lerPkcs12 falha com senha incorreta sem vazar a senha', () => {
  const { pfx } = gerarPfxTeste({ senha: 'certa' });
  assert.throws(
    () => lerPkcs12(pfx, 'errada'),
    (err) => {
      assert.match(err.message, /senha incorreta ou arquivo inválido/i);
      assert.doesNotMatch(err.message, /errada/);
      return true;
    },
  );
});

test('lerPkcs12 rejeita buffer vazio', () => {
  assert.throws(() => lerPkcs12(Buffer.alloc(0), 'x'), /vazio/i);
});

test('extrairCnpjCpf entende CNPJ (14) e CPF (11) e ignora lixo', () => {
  assert.equal(extrairCnpjCpf('FULANO:12345678000199'), '12345678000199');
  assert.equal(extrairCnpjCpf('FULANO:11122233344'), '11122233344');
  assert.equal(extrairCnpjCpf('SEM DOC'), null);
  assert.equal(extrairCnpjCpf('FULANO:123'), null);
});

test('extrairTitular remove o sufixo :DOC', () => {
  assert.equal(extrairTitular('EMPRESA X LTDA:12345678000199'), 'EMPRESA X LTDA');
  assert.equal(extrairTitular('SEM SUFIXO'), 'SEM SUFIXO');
});
