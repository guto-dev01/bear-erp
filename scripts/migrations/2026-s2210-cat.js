'use strict';

/**
 * Migração — evento eSocial S-2210 (CAT / Comunicação de Acidente de Trabalho).
 *
 * Idempotente. Cria a coleção de detalhe `esocial_s2210` (vinculada ao registro
 * pai `eventos_esocial` por `eventoId`) com os campos do leiaute S-1.3. Grupos
 * aninhados/repetitivos (localAcidente, parteAtingida 1..N, agenteCausador 1..N,
 * atestado) ficam como JSON-string — mesmo padrão já usado para `erros`.
 *
 * NÃO toca em assinatura/SOAP/lote/máquina de estado nem nas Functions de envio.
 * Apenas adiciona uma coleção nova; o S-2210 se "pluga" no encanamento existente.
 *
 * Uso:
 *   node scripts/migrations/2026-s2210-cat.js
 *
 * Requer .env na raiz: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 * APPWRITE_DB_ID. Nunca commite o .env.
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// ── carrega .env da raiz (sem dotenv), mesmo padrão dos demais scripts ────────
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
  console.error('❌ APPWRITE_API_KEY ausente. Defina no .env da raiz (nunca commite o valor).');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const COL = 'esocial_s2210';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jaExiste = (e) => e?.code === 409 || /already exists/i.test(e?.message || '');

// Apenas usuários autenticados (mesmo modelo do appwrite-setup.js).
const PERMISSIONS = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

async function addString(key, size, required = false) {
  try {
    await db.createStringAttribute(DB_ID, COL, key, size, required, required ? undefined : '');
    console.log(`  ✓ ${COL}.${key} (string)`);
  } catch (e) {
    if (jaExiste(e)) console.log(`  ~ ${COL}.${key} já existe`);
    else console.error(`  ✗ ${COL}.${key}:`, e.message?.slice(0, 100));
  }
  await sleep(350);
}

async function addInteger(key, required = false) {
  try {
    await db.createIntegerAttribute(DB_ID, COL, key, required, undefined, undefined, required ? undefined : 0);
    console.log(`  ✓ ${COL}.${key} (integer)`);
  } catch (e) {
    if (jaExiste(e)) console.log(`  ~ ${COL}.${key} já existe`);
    else console.error(`  ✗ ${COL}.${key}:`, e.message?.slice(0, 100));
  }
  await sleep(350);
}

async function criarColecao() {
  console.log(`\n▶ Coleção de detalhe do S-2210: ${COL}`);
  try {
    await db.createCollection(DB_ID, COL, 'eSocial S-2210 (CAT)', PERMISSIONS);
    console.log('  ✓ Coleção criada.');
  } catch (e) {
    if (jaExiste(e)) console.log('  ~ Coleção já existe.');
    else throw e;
  }
  await sleep(350);
}

async function criarAtributos() {
  console.log('\n▶ Atributos');
  await addString('eventoId', 50, true); // -> eventos_esocial.$id
  // ideVinculo
  await addString('cpfTrab', 11, true);
  await addString('matricula', 30);
  // bloco cat (escalares)
  await addString('dtAcid', 10, true);
  await addString('tpAcid', 6);
  await addString('hrAcid', 4);
  await addString('hrsTrabAntesAcid', 4);
  await addInteger('tpCat', true);
  await addString('indCatObito', 1);
  await addString('dtObito', 10);
  await addString('indComunPolicia', 1, true);
  await addString('codSitGeradora', 12, true);
  await addInteger('iniciatCAT', true);
  await addString('obsCAT', 999);
  await addString('ultDiaTrab', 10);
  await addString('houveAfast', 1, true);
  // Grupos aninhados/repetitivos como JSON. Tamanhos enxutos de propósito:
  // o Appwrite reserva o tamanho do varchar na largura da linha (~65535 bytes,
  // utf8mb4 = 4 bytes/char), então valores grandes demais estouram a coleção.
  await addString('localAcidenteJson', 1500, true);
  await addString('partesAtingidasJson', 2500, true);
  await addString('agentesCausadoresJson', 1200, true);
  await addString('atestadoJson', 1200);
  // multi-tenant
  await addString('empresaId', 50, true);
  await addString('tenantId', 50, true);
  await addString('createdAt', 30);
}

async function main() {
  console.log('=== Migração — eSocial S-2210 (CAT), idempotente ===');
  console.log(`DB: ${DB_ID} | Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
  await criarColecao();
  await criarAtributos();
  console.log('\n✓ Migração concluída.');
}

main().catch((e) => {
  console.error('Falha na migração:', e);
  process.exit(1);
});
