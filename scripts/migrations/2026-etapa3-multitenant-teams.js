'use strict';

/**
 * Migração — Etapa 3 (isolamento multi-tenant por Appwrite Teams).
 *
 * IDEMPOTENTE. Aplica, em ordem segura:
 *   1. Cria um Appwrite Team por tenant existente (teamId === tenantId) a partir
 *      da coleção `usuarios`, e adiciona cada usuário ao seu Team com a role do
 *      app (ADMIN vira owner). Resolve o id do Auth pelo e-mail.
 *   2. BACKFILL das permissões dos documentos já existentes para
 *      Role.team(tenantId) — primeiro nas coleções mais sensíveis.
 *   3. Liga `documentSecurity` e troca a permissão de COLEÇÃO de Role.users()
 *      (que liberava tudo a qualquer logado) por só `create` — read/update/delete
 *      passam a vir do documento (escopo por Team). Tabelas de referência globais
 *      continuam legíveis por todos.
 *
 * A ordem importa: backfill ANTES de ligar documentSecurity, senão documentos
 * sem permissão ficariam invisíveis. O bucket `certificados-a1` NÃO é tocado:
 * continua privado (acesso só pela API key do servidor/Function).
 *
 * Uso:
 *   node scripts/migrations/2026-etapa3-multitenant-teams.js
 *   node scripts/migrations/2026-etapa3-multitenant-teams.js --so-sensiveis   # valida só as sensíveis
 *
 * Requer .env na raiz: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 * (com escopos de teams.write/users.read/databases.write), APPWRITE_DB_ID.
 */

const { Client, Databases, Teams, Users } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const {
  garantirTeam,
  resolverUserIdPorEmail,
  adicionarMembro,
  backfillColecao,
  securizarColecao,
  mapearUsuariosPorTenant,
} = require('./lib/tenant-teams');

// ── .env da raiz (mesmo padrão dos outros scripts) ───────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
  }
}
loadEnv();

const API_KEY = process.env.APPWRITE_API_KEY;
if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY ausente no .env (precisa de teams.write, users.read, databases.write).');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const teams = new Teams(client);
const users = new Users(client);
const DB_ID = process.env.APPWRITE_DB_ID;

// Coleções na ordem de validação: SENSÍVEIS primeiro.
const SENSIVEIS = [
  'certificados', 'empresas', 'lancamentos', 'notas_fiscais',
  'apuracoes_fiscais', 'escrituracoes_fiscais', 'guias_fiscais',
];
const DEMAIS = [
  'roles', 'usuarios', 'plano_contas', 'clientes', 'fornecedores',
  'contas_pagar', 'contas_receber', 'funcionarios', 'obrigacoes',
  'tabela_inss', 'tabela_irrf', 'tabela_simples', 'honorarios', 'tarefas',
  'centros_custo', 'regras_contabilizacao', 'cte', 'ferias', 'rescisoes',
  'split_payment', 'audit_logs', 'produtos', 'contas_bancarias',
  'bens_patrimoniais', 'holerites', 'tenants', 'conciliacoes',
  'operacoes_certificado', 'integracoes', 'logs_integracao', 'periodos_contabeis',
  'exercicios_contabeis', 'historicos_padrao', 'movimentos_bancarios', 'ciap',
  'depreciacoes', 'eventos_esocial', 'esocial_s2210', 'sped_fiscal',
  'consultas_ia', 'classificacoes_automaticas', 'relatorios',
];

async function etapaTeams() {
  console.log('\n▶ 1) Teams por tenant + membros');
  const porTenant = await mapearUsuariosPorTenant(db, DB_ID);
  if (!porTenant.size) {
    console.log('  ~ Nenhum tenant encontrado em `usuarios` (nada a criar).');
    return;
  }
  const cacheEmail = new Map();
  for (const [tenantId, membros] of porTenant) {
    await garantirTeam(teams, tenantId, `Escritório ${tenantId}`);
    for (const m of membros) {
      const userId = await resolverUserIdPorEmail(users, m.email, cacheEmail);
      if (!userId) { console.log(`  ✗ Sem conta Auth p/ ${m.email} — pulado`); continue; }
      await adicionarMembro(teams, tenantId, userId, m.roles);
    }
  }
}

async function etapaBackfillESecuriza(colecoes) {
  console.log('\n▶ 2/3) Backfill de permissões + documentSecurity');
  for (const col of colecoes) {
    console.log(`\n— ${col}`);
    await backfillColecao(db, DB_ID, col);   // primeiro os documentos…
    await securizarColecao(db, DB_ID, col);  // …depois liga documentSecurity
  }
}

async function main() {
  const soSensiveis = process.argv.includes('--so-sensiveis');
  const colecoes = soSensiveis ? SENSIVEIS : [...SENSIVEIS, ...DEMAIS];
  console.log('=== Migração Etapa 3 — multi-tenant por Teams (idempotente) ===');
  console.log(`DB: ${DB_ID} | Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
  console.log(`Coleções: ${soSensiveis ? 'SOMENTE SENSÍVEIS' : 'todas'} (${colecoes.length})`);

  await etapaTeams();
  await etapaBackfillESecuriza(colecoes);

  console.log('\n✓ Migração concluída. Reveja o acesso das coleções no console do Appwrite.');
}

main().catch((e) => {
  console.error('Falha na migração:', e);
  process.exit(1);
});
