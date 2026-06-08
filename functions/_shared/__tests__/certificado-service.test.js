'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  carregarCertificado,
  avaliarVencimento,
  montarMetadados,
} = require('../certificado/certificado-service');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { MemoriaVault } = require('../cofre/memoria-vault');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

test('avaliarVencimento classifica vigente, em alerta e vencido', () => {
  const base = new Date('2026-06-08T00:00:00Z');
  const em10dias = new Date('2026-06-18T00:00:00Z');
  const em100dias = new Date('2026-09-16T00:00:00Z');
  const ontem = new Date('2026-06-07T00:00:00Z');

  assert.deepEqual(avaliarVencimento(em10dias, 30, base).alerta, true);
  assert.equal(avaliarVencimento(em10dias, 30, base).vencido, false);
  assert.equal(avaliarVencimento(em100dias, 30, base).alerta, false);
  assert.equal(avaliarVencimento(ontem, 30, base).vencido, true);
  assert.equal(avaliarVencimento(ontem, 30, base).diasParaVencer, -1);
});

test('carregarCertificado retorna metadados seguros + material separado', async () => {
  const { pfx, senha } = gerarPfxTeste({
    cn: 'ACME CONTABIL LTDA:99888777000166',
    diasValidade: 200,
  });
  const cofre = new MemoriaVault().registrar('emp1', { pfx, senha });

  const { metadados, material } = await carregarCertificado(cofre, 'emp1', {
    diasAlerta: 30,
  });

  assert.equal(metadados.titular, 'ACME CONTABIL LTDA');
  assert.equal(metadados.cnpjCpf, '99888777000166');
  assert.equal(metadados.vencido, false);
  // metadados NÃO devem conter material sensível
  assert.equal('privateKeyPem' in metadados, false);
  assert.equal('leafPem' in metadados, false);
  // material traz a chave para a assinatura (Etapa 3)
  assert.match(material.privateKeyPem, /PRIVATE KEY/);
  assert.match(material.leafPem, /CERTIFICATE/);
  assert.ok(Array.isArray(material.chainPem));
});

test('montarMetadados marca alerta para certificado perto de vencer', () => {
  const { pfx, senha } = gerarPfxTeste({ diasValidade: 5 });
  const p12 = lerPkcs12(pfx, senha);
  const meta = montarMetadados(p12, { diasAlerta: 30 });
  assert.equal(meta.alerta, true);
  assert.equal(meta.vencido, false);
});

test('cofre desconhecido propaga erro claro', async () => {
  const cofre = new MemoriaVault();
  await assert.rejects(() => carregarCertificado(cofre, 'inexistente'), /não encontrado/i);
});
