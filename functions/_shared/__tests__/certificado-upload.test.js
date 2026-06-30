'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { processarUpload } = require('../certificado/upload-certificado');
const { decifrar, ehTokenCofre } = require('../cripto/segredo');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

const MASTER = Buffer.alloc(32, 3).toString('base64');
const CNPJ = '12345678000199';

// Fakes de Appwrite (databases/storage) que registram o que foi gravado.
function fakes({ empresaCnpj = '12.345.678/0001-99', certAnterior } = {}) {
  const state = {
    files: new Map(),
    docs: { empresas: new Map(), certificados: new Map(), audit_logs: new Map() },
    empresaUpdates: [],
  };
  state.docs.empresas.set('emp1', { $id: 'emp1', cnpj: empresaCnpj, tenantId: 'tenantA', certificadoDigitalId: certAnterior });
  if (certAnterior) {
    state.docs.certificados.set(certAnterior, { $id: certAnterior, storageFileId: 'file-old' });
    state.files.set('file-old', { antigo: true });
  }
  const databases = {
    async getDocument(_db, col, id) {
      const d = state.docs[col]?.get(id);
      if (!d) throw new Error(`doc inexistente ${col}/${id}`);
      return d;
    },
    async createDocument(_db, col, id, data, perms) {
      state.docs[col].set(id, { $id: id, ...data, $perms: perms });
      return state.docs[col].get(id);
    },
    async updateDocument(_db, col, id, patch) {
      const atual = state.docs[col].get(id) || { $id: id };
      const novo = { ...atual, ...patch };
      state.docs[col].set(id, novo);
      if (col === 'empresas') state.empresaUpdates.push(patch);
      return novo;
    },
    async deleteDocument(_db, col, id) {
      state.docs[col].delete(id);
    },
  };
  const storage = {
    async createFile({ bucketId, fileId, file }) {
      assert.equal(bucketId, 'certificados-a1');
      state.files.set(fileId, file);
      return { $id: fileId };
    },
    async deleteFile({ fileId }) {
      state.files.delete(fileId);
    },
  };
  return { state, databases, storage };
}

function depsBase(over = {}) {
  let n = 0;
  return {
    dbId: 'db1',
    bucketId: 'certificados-a1',
    env: { CERT_MASTER_KEY: MASTER },
    criarInputFile: (buf, nome) => ({ __pfx: true, nome, len: buf.length }),
    idGen: () => `id${++n}`,
    agora: () => new Date('2026-06-15T12:00:00Z'),
    ...over,
  };
}

test('upload feliz: grava arquivo, cifra senha, cria cert escopado e repoint da empresa', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { state, databases, storage } = fakes();
  const deps = { ...depsBase(), databases, storage };

  const r = await processarUpload(deps, {
    empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha, usuario: 'maria@x.com',
  });

  assert.equal(r.ok, true);
  // arquivo no bucket
  assert.equal(state.files.size, 1);
  // documento de certificado criado, escopado por team
  const cert = [...state.docs.certificados.values()][0];
  assert.equal(cert.empresaId, 'emp1');
  assert.equal(cert.tenantId, 'tenantA');
  assert.equal(cert.cnpjCpf, CNPJ);
  assert.equal(cert.status, 'ATIVO');
  assert.ok(cert.$perms.includes('read("team:tenantA")'));
  assert.ok(cert.$perms.includes('update("team:tenantA")'));
  assert.ok(cert.$perms.includes('delete("team:tenantA")'));
  // empresa repointada
  assert.equal(state.empresaUpdates[0].certificadoDigitalId, r.certificadoId);
  // auditoria registrada sem senha
  const audit = [...state.docs.audit_logs.values()][0];
  assert.equal(audit.modulo, 'certificados');
  assert.doesNotMatch(JSON.stringify(audit), new RegExp(senha.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('a senha NUNCA é gravada em claro — só o ciphertext (senhaCofre)', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { state, databases, storage } = fakes();
  await processarUpload({ ...depsBase(), databases, storage }, { empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha });

  const cert = [...state.docs.certificados.values()][0];
  assert.equal(ehTokenCofre(cert.senhaCofre), true);
  assert.notEqual(cert.senhaCofre, senha);
  // e o ciphertext decifra de volta para a senha original
  assert.equal(decifrar(cert.senhaCofre, { CERT_MASTER_KEY: MASTER }), senha);
});

test('recusa quando o CNPJ do certificado diverge do CNPJ da empresa', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `OUTRA EMPRESA:99999999000191` });
  const { databases, storage } = fakes({ empresaCnpj: '12.345.678/0001-99' });
  await assert.rejects(
    () => processarUpload({ ...depsBase(), databases, storage }, { empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha }),
    (e) => { assert.equal(e.codigo, 'CNPJ_DIVERGENTE'); return true; },
  );
});

test('recusa certificado já vencido', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}`, diasValidade: 10 });
  const { databases, storage } = fakes();
  // "agora" muito à frente da validade (10 dias) → vencido
  const deps = { ...depsBase({ agora: () => new Date('2027-01-01T00:00:00Z') }), databases, storage };
  await assert.rejects(
    () => processarUpload(deps, { empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha }),
    (e) => { assert.equal(e.codigo, 'CERT_VENCIDO'); return true; },
  );
});

test('recusa senha incorreta (PKCS#12 não abre)', async () => {
  const { pfx } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { databases, storage } = fakes();
  await assert.rejects(
    () => processarUpload({ ...depsBase(), databases, storage }, { empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha: 'senha-errada' }),
    (e) => { assert.equal(e.codigo, 'PFX_INVALIDO'); return true; },
  );
});

test('substituição: remove o certificado anterior (doc + arquivo)', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { state, databases, storage } = fakes({ certAnterior: 'certOld' });
  await processarUpload({ ...depsBase(), databases, storage }, { empresaId: 'emp1', tenantId: 'tenantA', pfxBuffer: pfx, senha });

  assert.equal(state.docs.certificados.has('certOld'), false); // doc antigo removido
  assert.equal(state.files.has('file-old'), false); // arquivo antigo removido
});

test('exige tenantId, empresaId, pfx e senha (multi-tenant; falha fechado)', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { databases, storage } = fakes();
  const deps = { ...depsBase(), databases, storage };
  await assert.rejects(() => processarUpload(deps, { empresaId: 'emp1', pfxBuffer: pfx, senha }), /tenantId/);
  await assert.rejects(() => processarUpload(deps, { tenantId: 'tenantA', pfxBuffer: pfx, senha }), /empresaId/);
  await assert.rejects(() => processarUpload(deps, { tenantId: 'tenantA', empresaId: 'emp1', senha }), /pfx/i);
  await assert.rejects(() => processarUpload(deps, { tenantId: 'tenantA', empresaId: 'emp1', pfxBuffer: pfx }), /senha/);
});

test('recusa empresa de outro tenant', async () => {
  const { pfx, senha } = gerarPfxTeste({ cn: `EMPRESA TESTE LTDA:${CNPJ}` });
  const { databases, storage } = fakes();
  await assert.rejects(
    () => processarUpload({ ...depsBase(), databases, storage }, { empresaId: 'emp1', tenantId: 'OUTRO', pfxBuffer: pfx, senha }),
    (e) => { assert.equal(e.codigo, 'TENANT_DIVERGENTE'); return true; },
  );
});
