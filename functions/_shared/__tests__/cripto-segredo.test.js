'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  cifrar,
  decifrar,
  ehTokenCofre,
  lerChaveMestra,
  gerarChaveMestraBase64,
} = require('../cripto/segredo');

// Chave mestra fixa de teste (32 bytes em base64).
const ENV = { CERT_MASTER_KEY: Buffer.alloc(32, 7).toString('base64') };

test('round-trip: decifrar(cifrar(x)) === x', () => {
  const senha = 'S3nh@-do-A1!çãforte';
  const token = cifrar(senha, ENV);
  assert.match(token, /^v1\.gcm\./);
  assert.equal(decifrar(token, ENV), senha);
});

test('cada cifragem usa IV novo (tokens diferentes p/ mesmo texto)', () => {
  const a = cifrar('mesmo-texto', ENV);
  const b = cifrar('mesmo-texto', ENV);
  assert.notEqual(a, b);
  assert.equal(decifrar(a, ENV), 'mesmo-texto');
  assert.equal(decifrar(b, ENV), 'mesmo-texto');
});

test('aceita chave mestra em hex (64) e em base64 (44)', () => {
  const hexEnv = { CERT_MASTER_KEY: Buffer.alloc(32, 9).toString('hex') };
  assert.equal(lerChaveMestra(hexEnv).length, 32);
  const token = cifrar('abc', hexEnv);
  assert.equal(decifrar(token, hexEnv), 'abc');
});

test('decifrar detecta adulteração do ciphertext (tag GCM)', () => {
  const token = cifrar('intacto', ENV);
  const partes = token.split('.');
  // corrompe um byte do ciphertext
  const ct = Buffer.from(partes[3], 'base64url');
  ct[0] = ct[0] ^ 0xff;
  partes[3] = ct.toString('base64url');
  assert.throws(() => decifrar(partes.join('.'), ENV), /autenticação/);
});

test('decifrar com chave errada falha (não vaza segredo)', () => {
  const token = cifrar('segredo', ENV);
  const outraChave = { CERT_MASTER_KEY: Buffer.alloc(32, 1).toString('base64') };
  assert.throws(() => decifrar(token, outraChave), /autenticação/);
});

test('lerChaveMestra exige CERT_MASTER_KEY e 32 bytes', () => {
  assert.throws(() => lerChaveMestra({}), /CERT_MASTER_KEY ausente/);
  assert.throws(() => lerChaveMestra({ CERT_MASTER_KEY: 'YWJj' }), /32 bytes/); // "abc"
});

test('cifrar recusa texto vazio; decifrar recusa token malformado', () => {
  assert.throws(() => cifrar('', ENV), /obrigatório/);
  assert.throws(() => decifrar('lixo', ENV), /inválido|versão/);
  assert.throws(() => decifrar('v2.gcm.a.b.c', ENV), /versão|inválido/);
});

test('ehTokenCofre distingue token de senha em claro', () => {
  assert.equal(ehTokenCofre(cifrar('x', ENV)), true);
  assert.equal(ehTokenCofre('senha-em-claro'), false);
  assert.equal(ehTokenCofre(undefined), false);
});

test('gerarChaveMestraBase64 produz 32 bytes utilizáveis', () => {
  const chave = gerarChaveMestraBase64();
  const env = { CERT_MASTER_KEY: chave };
  assert.equal(lerChaveMestra(env).length, 32);
  assert.equal(decifrar(cifrar('ok', env), env), 'ok');
});
