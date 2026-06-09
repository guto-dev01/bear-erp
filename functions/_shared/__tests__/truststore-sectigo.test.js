'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  inspecionarTruststore,
  agentOptions,
  ARQUIVOS_ESPERADOS,
} = require('../soap/truststore-sectigo');

function dirTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sectigo-'));
}

const PEM_FAKE =
  '-----BEGIN CERTIFICATE-----\nMIIBfakeconteudo==\n-----END CERTIFICATE-----\n';

test('reporta ambas as cadeias como faltando em diretório vazio', () => {
  const t = inspecionarTruststore({ env: {}, dir: dirTemp() });
  assert.equal(t.instalado, false);
  assert.equal(t.ca.length, 0);
  assert.equal(t.faltando.length, 2);
  assert.deepEqual(
    t.faltando.map((f) => f.arquivo).sort(),
    ARQUIVOS_ESPERADOS.map((a) => a.arquivo).sort(),
  );
});

test('reconhece as cadeias quando os .pem válidos estão presentes', () => {
  const dir = dirTemp();
  for (const item of ARQUIVOS_ESPERADOS) {
    fs.writeFileSync(path.join(dir, item.arquivo), PEM_FAKE);
  }
  const t = inspecionarTruststore({ env: {}, dir });
  assert.equal(t.instalado, true);
  assert.equal(t.ca.length, 2);
  assert.equal(t.faltando.length, 0);
});

test('ignora arquivo que não é PEM (sem BEGIN CERTIFICATE)', () => {
  const dir = dirTemp();
  fs.writeFileSync(path.join(dir, 'sectigo-root-r4.pem'), 'lixo qualquer');
  const t = inspecionarTruststore({ env: {}, dir });
  assert.equal(t.instalado, false);
  assert.equal(t.presentes.length, 0);
});

test('agentOptions estrito aborta com mensagem clara se incompleto', () => {
  assert.throws(
    () => agentOptions({ env: {}, dir: dirTemp(), estrito: true }),
    /Trust store Sectigo incompleto/,
  );
});

test('agentOptions não-estrito retorna ca vazio sem lançar', () => {
  const r = agentOptions({ env: {}, dir: dirTemp(), estrito: false });
  assert.deepEqual(r.ca, []);
});
