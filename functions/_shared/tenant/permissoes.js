'use strict';

const { Permission, Role } = require('node-appwrite');

/**
 * Permissões de documento escopadas ao Team dono do escritório (tenant).
 *
 * Modelo de isolamento multi-tenant (Etapa 3):
 *  - cada escritório é um Appwrite Team cujo id É o `tenantId`;
 *  - `documentSecurity` LIGADO nas coleções;
 *  - cada documento nasce com read/update/delete para `Role.team(tenantId)`;
 *  - no nível da COLEÇÃO fica só `create` para `Role.users()` (qualquer logado
 *    cria, mas o documento já nasce restrito ao seu Team) — read/update/delete
 *    NÃO ficam na coleção, senão vazariam entre tenants.
 *
 * Este módulo é PURO (sem rede): só monta/compara strings de permissão, então é
 * testável offline e reaproveitado pelo upload de certificado e pela migração.
 */

/** As 3 permissões de documento de um tenant. */
function permissoesDoTenant(tenantId) {
  if (!tenantId) throw new Error('tenantId obrigatório para escopo de permissões');
  return [
    Permission.read(Role.team(tenantId)),
    Permission.update(Role.team(tenantId)),
    Permission.delete(Role.team(tenantId)),
  ];
}

/** Permissão de COLEÇÃO no novo modelo: só create para usuários logados. */
function permissoesColecaoTenant() {
  return [Permission.create(Role.users())];
}

/**
 * Coleção de REFERÊNCIA global (tabelas fiscais compartilhadas entre tenants):
 * não é escopada por Team; permanece legível por qualquer usuário logado, mas
 * só o servidor escreve.
 */
function permissoesColecaoGlobal() {
  return [Permission.read(Role.users())];
}

/**
 * O documento já tem TODAS as permissões-alvo do tenant? Usado para tornar o
 * backfill idempotente (reexecução não reescreve o que já está correto).
 * @param {string[]} permsAtuais  doc.$permissions
 * @param {string} tenantId
 */
function jaEscopado(permsAtuais, tenantId) {
  const alvo = permissoesDoTenant(tenantId);
  const atuais = new Set(permsAtuais || []);
  return alvo.every((p) => atuais.has(p));
}

/** Conveniência inversa de `jaEscopado`. */
function precisaBackfill(permsAtuais, tenantId) {
  return !jaEscopado(permsAtuais, tenantId);
}

module.exports = {
  permissoesDoTenant,
  permissoesColecaoTenant,
  permissoesColecaoGlobal,
  jaEscopado,
  precisaBackfill,
};
