'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const crypto = require('node:crypto');
const { AppwriteStorageVault, paraBuffer, decifrarSenha } = require('../cofre/appwrite-storage-vault');

// Cifra no MESMO formato do frontend (Web Crypto AES-GCM): iv:cipher+tag, base64.
function cifrarComoFrontend(plain, chaveBase64) {
  const chave = Buffer.from(chaveBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const cipher = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return `${iv.toString('base64')}:${Buffer.concat([cipher, tag]).toString('base64')}`;
}

function fakesComArquivo(pfxBuffer) {
  const databases = {
    async getDocument(_db, col, id) {
      if (col === 'empresas' && id === 'emp1') {
        return { $id: 'emp1', certificadoDigitalId: 'cert1' };
      }
      if (col === 'certificados' && id === 'cert1') {
        return { $id: 'cert1', storageFileId: 'file1' };
      }
      throw new Error(`doc inesperado ${col}/${id}`);
    },
  };
  const storage = {
    async getFileDownload(bucket, file) {
      assert.equal(bucket, 'certificados-a1');
      assert.equal(file, 'file1');
      // simula retorno do SDK como ArrayBuffer
      return pfxBuffer.buffer.slice(
        pfxBuffer.byteOffset,
        pfxBuffer.byteOffset + pfxBuffer.byteLength,
      );
    },
  };
  return { databases, storage };
}

test('AppwriteStorageVault resolve fileId pela empresa e lê senha do env', async () => {
  const conteudo = Buffer.from('conteudo-pfx-fake');
  const { databases, storage } = fakesComArquivo(conteudo);

  const vault = new AppwriteStorageVault({
    storage,
    databases,
    bucketId: 'certificados-a1',
    dbId: 'db1',
    env: { CERT_SENHA_EMP1: 'segredo-da-emp1' },
  });

  const { pfx, senha } = await vault.carregar('emp1');
  assert.ok(Buffer.isBuffer(pfx));
  assert.equal(pfx.toString(), 'conteudo-pfx-fake');
  assert.equal(senha, 'segredo-da-emp1');
});

test('AppwriteStorageVault usa CERT_SENHA como fallback', async () => {
  const { databases, storage } = fakesComArquivo(Buffer.from('x'));
  const vault = new AppwriteStorageVault({
    storage,
    databases,
    bucketId: 'certificados-a1',
    dbId: 'db1',
    env: { CERT_SENHA: 'senha-geral' },
  });
  const { senha } = await vault.carregar('emp1');
  assert.equal(senha, 'senha-geral');
});

test('AppwriteStorageVault falha claro quando a senha não está no ambiente', async () => {
  const { databases, storage } = fakesComArquivo(Buffer.from('x'));
  const vault = new AppwriteStorageVault({
    storage,
    databases,
    bucketId: 'certificados-a1',
    dbId: 'db1',
    env: {},
  });
  await assert.rejects(() => vault.carregar('emp1'), /senha do certificado.*ausente/i);
});

test('AppwriteStorageVault falha quando empresa não tem certificado', async () => {
  const databases = {
    async getDocument() {
      return { $id: 'emp2' }; // sem certificadoDigitalId
    },
  };
  const vault = new AppwriteStorageVault({
    storage: {},
    databases,
    bucketId: 'b',
    dbId: 'db1',
    env: { CERT_SENHA: 'x' },
  });
  await assert.rejects(() => vault.carregar('emp2'), /não possui certificadoDigitalId/i);
});

test('AppwriteStorageVault prefere a senha cifrada do documento (senhaCert)', async () => {
  const CHAVE = crypto.randomBytes(32).toString('base64');
  const senhaCert = cifrarComoFrontend('senha-do-pfx', CHAVE);
  const databases = {
    async getDocument(_db, col, id) {
      if (col === 'empresas') return { $id: 'emp1', certificadoDigitalId: 'cert1' };
      if (col === 'certificados') return { $id: 'cert1', storageFileId: 'file1', senhaCert };
      throw new Error(`doc inesperado ${col}/${id}`);
    },
  };
  const storage = { async getFileDownload() { return Buffer.from('pfx').buffer; } };
  const vault = new AppwriteStorageVault({
    storage, databases, bucketId: 'b', dbId: 'db1',
    env: { CERT_VAULT_KEY: CHAVE, CERT_SENHA: 'nao-deve-usar' },
  });
  const { senha } = await vault.carregar('emp1');
  assert.equal(senha, 'senha-do-pfx');
});

test('AppwriteStorageVault exige CERT_VAULT_KEY quando há senhaCert', async () => {
  const databases = {
    async getDocument(_db, col) {
      if (col === 'empresas') return { certificadoDigitalId: 'cert1' };
      return { storageFileId: 'file1', senhaCert: 'aa:bb' };
    },
  };
  const storage = { async getFileDownload() { return Buffer.from('x').buffer; } };
  const vault = new AppwriteStorageVault({ storage, databases, bucketId: 'b', dbId: 'db1', env: {} });
  await assert.rejects(() => vault.carregar('emp1'), /CERT_VAULT_KEY/);
});

test('decifrarSenha faz round-trip com a cifragem do frontend', () => {
  const CHAVE = crypto.randomBytes(32).toString('base64');
  const blob = cifrarComoFrontend('áéí-senha-#123', CHAVE);
  assert.equal(decifrarSenha(blob, CHAVE), 'áéí-senha-#123');
});

test('paraBuffer normaliza Buffer, ArrayBuffer e Uint8Array', () => {
  assert.equal(paraBuffer(Buffer.from('abc')).toString(), 'abc');
  // Uint8Array com buffer próprio de exatamente 3 bytes
  const u8 = new Uint8Array([97, 98, 99]);
  assert.equal(paraBuffer(u8).toString(), 'abc');
  // ArrayBuffer isolado (não o pool interno do Node)
  const ab = new ArrayBuffer(3);
  new Uint8Array(ab).set([97, 98, 99]);
  assert.equal(paraBuffer(ab).toString(), 'abc');
});

test('construtor exige dependências obrigatórias', () => {
  assert.throws(() => new AppwriteStorageVault({}), /storage é obrigatório/);
});
