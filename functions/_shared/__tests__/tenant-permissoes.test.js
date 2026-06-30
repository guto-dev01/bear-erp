'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  permissoesDoTenant,
  permissoesColecaoTenant,
  permissoesColecaoGlobal,
  jaEscopado,
  precisaBackfill,
} = require('../tenant/permissoes');

test('permissoesDoTenant escopa read/update/delete ao Team', () => {
  const p = permissoesDoTenant('tenantA');
  assert.deepEqual(p, [
    'read("team:tenantA")',
    'update("team:tenantA")',
    'delete("team:tenantA")',
  ]);
});

test('permissoesDoTenant NÃO concede create (create é da coleção) nem expõe a outros', () => {
  const p = permissoesDoTenant('tenantA');
  assert.ok(!p.some((x) => x.startsWith('create(')));
  assert.ok(!p.some((x) => /users\(\)/.test(x)));
});

test('permissoesDoTenant exige tenantId (falha fechado)', () => {
  assert.throws(() => permissoesDoTenant(''), /tenantId obrigatório/);
  assert.throws(() => permissoesDoTenant(undefined), /tenantId obrigatório/);
});

test('coleção tenant = só create p/ usuários logados', () => {
  assert.deepEqual(permissoesColecaoTenant(), ['create("users")']);
});

test('coleção global de referência = read p/ usuários logados', () => {
  assert.deepEqual(permissoesColecaoGlobal(), ['read("users")']);
});

test('jaEscopado é verdadeiro só quando as 3 perms do tenant já estão presentes', () => {
  const certo = permissoesDoTenant('t1');
  assert.equal(jaEscopado(certo, 't1'), true);
  assert.equal(jaEscopado([...certo, 'read("user:x")'], 't1'), true); // extras não atrapalham
  assert.equal(jaEscopado(['read("team:t1")'], 't1'), false); // faltam update/delete
  assert.equal(jaEscopado([], 't1'), false);
  assert.equal(jaEscopado(certo, 't2'), false); // tenant errado
});

test('precisaBackfill é o inverso de jaEscopado', () => {
  assert.equal(precisaBackfill([], 't1'), true);
  assert.equal(precisaBackfill(permissoesDoTenant('t1'), 't1'), false);
});
