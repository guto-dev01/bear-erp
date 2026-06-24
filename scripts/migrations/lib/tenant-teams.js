'use strict';

/**
 * Biblioteca de SECURIZAÇÃO multi-tenant por Appwrite Teams (Etapa 3).
 *
 * Reaproveitada pela migração (`2026-etapa3-multitenant-teams.js`) e pelo
 * `appwrite-setup.js` (instalação nova). Tudo aqui toca rede/SDK; a regra PURA
 * de permissões vive em `functions/_shared/tenant/permissoes.js` (testada).
 *
 * Idempotente em todas as operações: criar Team, adicionar membro e backfill de
 * permissões podem ser reexecutados sem efeito colateral.
 */

const { Query } = require('node-appwrite');
const {
  permissoesDoTenant,
  permissoesColecaoTenant,
  permissoesColecaoGlobal,
  precisaBackfill,
} = require('../../../functions/_shared/tenant/permissoes');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const conflito = (e) => e?.code === 409 || /already exists|already a member|membership already/i.test(e?.message || '');

/**
 * Coleções de REFERÊNCIA global (tabelas fiscais compartilhadas): não escopadas
 * por Team — permanecem legíveis por qualquer usuário logado.
 */
const COLECOES_GLOBAIS = new Set(['tabela_inss', 'tabela_irrf', 'tabela_simples']);

/** Cria (ou confirma) o Team de um tenant. teamId === tenantId. */
async function garantirTeam(teams, tenantId, nome, log = console.log) {
  try {
    await teams.create(tenantId, nome || tenantId);
    log(`  ✓ Team criado: ${tenantId} (${nome || tenantId})`);
  } catch (e) {
    if (conflito(e)) log(`  ~ Team já existe: ${tenantId}`);
    else throw e;
  }
  await sleep(200);
}

/**
 * Resolve o id do usuário no Appwrite Auth a partir do e-mail (com cache).
 * Retorna null se não houver conta Auth correspondente.
 */
async function resolverUserIdPorEmail(users, email, cache, log = console.log) {
  if (!email) return null;
  const chave = email.toLowerCase();
  if (cache.has(chave)) return cache.get(chave);
  let id = null;
  try {
    const r = await users.list([Query.equal('email', email), Query.limit(1)]);
    id = r.users?.[0]?.$id ?? null;
  } catch (e) {
    log(`  ✗ Falha ao resolver usuário ${email}: ${e.message?.slice(0, 80)}`);
  }
  cache.set(chave, id);
  return id;
}

/** Adiciona um usuário (por userId) ao Team com as roles do app. Idempotente. */
async function adicionarMembro(teams, tenantId, userId, roles, log = console.log) {
  if (!userId) return;
  try {
    // Server-side com API key: vincula direto (sem e-mail de convite).
    await teams.createMembership(tenantId, roles?.length ? roles : ['member'], undefined, userId);
    log(`  ✓ Membro ${userId} → Team ${tenantId} [${(roles || ['member']).join(',')}]`);
  } catch (e) {
    if (conflito(e)) log(`  ~ ${userId} já é membro de ${tenantId}`);
    else log(`  ✗ Falha ao adicionar ${userId} a ${tenantId}: ${e.message?.slice(0, 80)}`);
  }
  await sleep(200);
}

/** Itera TODOS os documentos de uma coleção (paginado por cursor). */
async function* iterarDocumentos(db, dbId, colId, pagina = 100) {
  let cursor = null;
  for (;;) {
    const queries = [Query.limit(pagina)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const r = await db.listDocuments(dbId, colId, queries);
    const docs = r.documents || [];
    for (const d of docs) yield d;
    if (docs.length < pagina) break;
    cursor = docs[docs.length - 1].$id;
    await sleep(120);
  }
}

/**
 * Backfill das permissões de documento de uma coleção para Role.team(tenantId).
 * Pula docs já escopados (idempotente) e os sem tenantId (loga). Coleções
 * globais não recebem escopo de Team.
 * @returns {{ total:number, atualizados:number, semTenant:number, pulados:number }}
 */
async function backfillColecao(db, dbId, colId, log = console.log) {
  if (COLECOES_GLOBAIS.has(colId)) {
    log(`  ↷ ${colId}: coleção global de referência — sem escopo por Team`);
    return { total: 0, atualizados: 0, semTenant: 0, pulados: 0 };
  }
  const stats = { total: 0, atualizados: 0, semTenant: 0, pulados: 0 };
  for await (const doc of iterarDocumentos(db, dbId, colId)) {
    stats.total++;
    const tenantId = doc.tenantId;
    if (!tenantId) { stats.semTenant++; continue; }
    if (!precisaBackfill(doc.$permissions, tenantId)) { stats.pulados++; continue; }
    try {
      await db.updateDocument(dbId, colId, doc.$id, undefined, permissoesDoTenant(tenantId));
      stats.atualizados++;
    } catch (e) {
      log(`    ✗ ${colId}/${doc.$id}: ${e.message?.slice(0, 80)}`);
    }
    await sleep(120);
  }
  log(`  ✓ ${colId}: ${stats.atualizados} escopados, ${stats.pulados} já ok, ${stats.semTenant} sem tenantId (de ${stats.total})`);
  return stats;
}

/**
 * Liga `documentSecurity` e ajusta as permissões de COLEÇÃO:
 *  - tenant: só `create` p/ usuários logados (read/update/delete via documento);
 *  - global: `read` p/ usuários logados (referência compartilhada).
 * Faça o backfill ANTES, senão os documentos sem permissão ficam invisíveis.
 */
async function securizarColecao(db, dbId, colId, nome, log = console.log) {
  const global = COLECOES_GLOBAIS.has(colId);
  const perms = global ? permissoesColecaoGlobal() : permissoesColecaoTenant();
  try {
    await db.updateCollection(dbId, colId, nome || colId, perms, /* documentSecurity */ !global);
    log(`  ✓ ${colId}: documentSecurity=${!global}, perms=[${perms.join(', ')}]`);
  } catch (e) {
    log(`  ✗ ${colId}: ${e.message?.slice(0, 100)}`);
  }
  await sleep(300);
}

/**
 * Agrupa os usuários (coleção `usuarios`) por tenant e resolve as roles do app.
 * @returns {Promise<Map<string, Array<{ email:string, roles:string[] }>>>}
 */
async function mapearUsuariosPorTenant(db, dbId, log = console.log) {
  // roleId -> nome (p/ traduzir roleIds do usuário em roles de Team)
  const roleNome = new Map();
  try {
    for await (const r of iterarDocumentos(db, dbId, 'roles')) roleNome.set(r.$id, r.nome);
  } catch (e) {
    log(`  ~ roles indisponível (${e.message?.slice(0, 60)}) — usando role 'member'`);
  }
  const porTenant = new Map();
  for await (const u of iterarDocumentos(db, dbId, 'usuarios')) {
    const tenantId = u.tenantId;
    if (!tenantId) continue;
    const nomesRoles = (u.roleIds || []).map((id) => roleNome.get(id)).filter(Boolean);
    // Quem tem ADMIN vira owner do Team (pode administrar membros).
    const roles = [];
    if (nomesRoles.includes('ADMIN')) roles.push('owner');
    for (const n of nomesRoles) roles.push(n);
    if (!roles.length) roles.push('member');
    if (!porTenant.has(tenantId)) porTenant.set(tenantId, []);
    porTenant.get(tenantId).push({ email: u.email, roles: Array.from(new Set(roles)) });
  }
  return porTenant;
}

module.exports = {
  COLECOES_GLOBAIS,
  garantirTeam,
  resolverUserIdPorEmail,
  adicionarMembro,
  iterarDocumentos,
  backfillColecao,
  securizarColecao,
  mapearUsuariosPorTenant,
};
