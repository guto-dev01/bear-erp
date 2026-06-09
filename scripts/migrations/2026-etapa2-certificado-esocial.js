'use strict';

/**
 * Migração — Etapa 2 (integrações gov): fundação de certificado + eSocial.
 *
 * Idempotente. Aplica:
 *   1. Bucket PRIVADO `certificados-a1` no Appwrite Storage (criptografado,
 *      antivírus), acessível só pela API key do servidor/Function — guarda os
 *      arquivos .pfx do A1. A SENHA do certificado NÃO vai aqui (fica em env).
 *   2. Campos novos na coleção `certificados` (vínculo com o arquivo do cofre
 *      e metadados lidos do .pfx).
 *   3. Campos novos na coleção `eventos_esocial` para o controle de estado da
 *      transmissão (payload, protocolo, recibo, erros, ambiente, leiaute).
 *
 * Uso:
 *   node scripts/migrations/2026-etapa2-certificado-esocial.js
 *
 * Requer .env na raiz: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 * APPWRITE_DB_ID. Nunca commite o .env.
 */

const { Client, Databases, Storage, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// ── carrega .env da raiz (sem dotenv), mesmo padrão do appwrite-setup.js ──────
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
const storage = new Storage(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const BUCKET_CERT = process.env.CERT_BUCKET_ID || 'certificados-a1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jaExiste = (e) => e?.code === 409 || /already exists/i.test(e?.message || '');

// ── helpers de atributo (ignoram "já existe") ────────────────────────────────
async function addString(col, key, size, required = false, array = false) {
  try {
    await db.createStringAttribute(DB_ID, col, key, size, required, required || array ? undefined : '', array);
    console.log(`  ✓ ${col}.${key} (string${array ? '[]' : ''})`);
  } catch (e) {
    if (jaExiste(e)) console.log(`  ~ ${col}.${key} já existe`);
    else console.error(`  ✗ ${col}.${key}:`, e.message?.slice(0, 100));
  }
  await sleep(350);
}

async function addInteger(col, key, required = false) {
  try {
    await db.createIntegerAttribute(DB_ID, col, key, required, undefined, undefined, required ? undefined : 0);
    console.log(`  ✓ ${col}.${key} (integer)`);
  } catch (e) {
    if (jaExiste(e)) console.log(`  ~ ${col}.${key} já existe`);
    else console.error(`  ✗ ${col}.${key}:`, e.message?.slice(0, 100));
  }
  await sleep(350);
}

async function addBoolean(col, key, required = false) {
  try {
    await db.createBooleanAttribute(DB_ID, col, key, required, required ? undefined : false);
    console.log(`  ✓ ${col}.${key} (boolean)`);
  } catch (e) {
    if (jaExiste(e)) console.log(`  ~ ${col}.${key} já existe`);
    else console.error(`  ✗ ${col}.${key}:`, e.message?.slice(0, 100));
  }
  await sleep(350);
}

// ── 1) bucket privado do cofre ───────────────────────────────────────────────
async function criarBucketCertificados() {
  console.log(`\n▶ Bucket privado do cofre de certificados: ${BUCKET_CERT}`);
  try {
    await storage.createBucket(
      BUCKET_CERT,
      'Certificados A1 (cofre)',
      // Sem roles públicas: acesso só pela API key do servidor/Function.
      [Permission.read(Role.team('admin'))],
      /* fileSecurity */ false,
      /* enabled */ true,
      /* maximumFileSize */ 5 * 1024 * 1024, // .pfx é pequeno; 5MB com folga
      /* allowedFileExtensions */ ['pfx', 'p12'],
      /* compression */ 'none',
      /* encryption */ true,
      /* antivirus */ true,
    );
    console.log('  ✓ Bucket criado (privado, criptografado, antivírus).');
  } catch (e) {
    if (jaExiste(e)) console.log('  ~ Bucket já existe.');
    else console.error('  ✗ Erro ao criar bucket:', e.message);
  }
}

// ── 2) campos novos em `certificados` ────────────────────────────────────────
async function estenderCertificados() {
  console.log('\n▶ Estendendo coleção `certificados`');
  await addString('certificados', 'storageFileId', 50); // id do .pfx no bucket
  await addString('certificados', 'titular', 255);
  await addString('certificados', 'validoDe', 30);
  await addString('certificados', 'cadeiaIcp', 100, false, true); // emissores da cadeia
  await addBoolean('certificados', 'alertaVencimento');
}

// ── 3) campos novos em `eventos_esocial` (controle de estado) ─────────────────
async function estenderEventosEsocial() {
  console.log('\n▶ Estendendo coleção `eventos_esocial`');
  await addString('eventos_esocial', 'idEvento', 40); // Id único (idempotência)
  await addString('eventos_esocial', 'grupoEvento', 30); // tabela/periodico/nao-periodico
  await addString('eventos_esocial', 'loteId', 50);
  await addString('eventos_esocial', 'payloadXml', 1000000); // XML assinado enviado
  await addString('eventos_esocial', 'recibo', 100);
  await addString('eventos_esocial', 'erros', 20000); // rejeições de schema/negócio (JSON)
  await addInteger('eventos_esocial', 'ambiente'); // 1=producao, 2=restrita
  await addString('eventos_esocial', 'versaoLeiaute', 20);
  await addString('eventos_esocial', 'dataEnvio', 30);
  await addString('eventos_esocial', 'dataRetorno', 30);
}

async function main() {
  console.log('=== Migração Etapa 2 — certificado + eSocial (idempotente) ===');
  console.log(`DB: ${DB_ID} | Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
  await criarBucketCertificados();
  await estenderCertificados();
  await estenderEventosEsocial();
  console.log('\n✓ Migração concluída.');
}

main().catch((e) => {
  console.error('Falha na migração:', e);
  process.exit(1);
});
