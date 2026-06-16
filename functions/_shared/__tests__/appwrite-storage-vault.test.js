'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { AppwriteStorageVault, paraBuffer } = require('../cofre/appwrite-storage-vault');
const { cifrar } = require('../cripto/segredo');

function fakesComArquivo(pfxBuffer, certExtra = {}) {
  const databases = {
    async getDocument(_db, col, id) {
      if (col === 'empresas' && id === 'emp1') {
        return { $id: 'emp1', certificadoDigitalId: 'cert1' };
      }
      if (col === 'certificados' && id === 'cert1') {
        return { $id: 'cert1', storageFileId: 'file1', ...certExtra };
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

test('AppwriteStorageVault DECIFRA a senhaCofre com a chave mestra (caminho padrão)', async () => {
  const MASTER = { CERT_MASTER_KEY: Buffer.alloc(32, 5).toString('base64') };
  const senhaCofre = cifrar('senha-real-da-emp1', MASTER);
  const { databases, storage } = fakesComArquivo(Buffer.from('pfx-bytes'), { senhaCofre });

  const vault = new AppwriteStorageVault({
    storage,
    databases,
    bucketId: 'certificados-a1',
    dbId: 'db1',
    env: MASTER, // sem CERT_SENHA_* — vem do cofre cifrado
  });

  const { senha } = await vault.carregar('emp1');
  assert.equal(senha, 'senha-real-da-emp1');
});

test('senhaCofre tem prioridade sobre o fallback de env', async () => {
  const MASTER = { CERT_MASTER_KEY: Buffer.alloc(32, 5).toString('base64'), CERT_SENHA: 'env-antiga' };
  const senhaCofre = cifrar('senha-do-cofre', MASTER);
  const { databases, storage } = fakesComArquivo(Buffer.from('x'), { senhaCofre });
  const vault = new AppwriteStorageVault({ storage, databases, bucketId: 'certificados-a1', dbId: 'db1', env: MASTER });
  const { senha } = await vault.carregar('emp1');
  assert.equal(senha, 'senha-do-cofre');
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
