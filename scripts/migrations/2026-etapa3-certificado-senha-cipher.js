'use strict';

/**
 * Migração — Etapa 3 (cofre de senha do A1: env → ciphertext).
 *
 * IDEMPOTENTE. Aplica:
 *   1. Campo `senhaCofre` na coleção `certificados` (guarda o ciphertext
 *      AES-256-GCM da senha do .pfx — só o cofre cifrado, nunca em claro).
 *   2. (Opcional) CONVERSÃO das senhas que hoje vivem em variável de ambiente
 *      (`CERT_SENHA_<empresaId>` / `CERT_SENHA`) para `senhaCofre`, cifrando com
 *      a chave mestra `CERT_MASTER_KEY`. Só roda quando a chave mestra e a senha
 *      em env existem; pula o que já tem `senhaCofre`.
 *
 * O ideal a médio prazo é REENVIAR cada A1 pela tela/Function `certificado-upload`
 * (que valida CNPJ/vencimento e cifra a senha). Esta conversão é uma ponte para
 * não perder o que já está configurado em env.
 *
 * Uso:
 *   node scripts/migrations/2026-etapa3-certificado-senha-cipher.js
 *
 * Requer .env na raiz: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 * APPWRITE_DB_ID e, para a conversão, CERT_MASTER_KEY (+ CERT_SENHA_*).
 */

const { Client, Databases, Query } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const { cifrar, ehTokenCofre } = require('../../functions/_shared/cripto/segredo');

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
  console.error('❌ APPWRITE_API_KEY ausente no .env.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jaExiste = (e) => e?.code === 409 || /already exists/i.test(e?.message || '');

async function addSenhaCofre() {
  console.log('\n▶ 1) Campo `certificados.senhaCofre`');
  try {
    // opcional (default ''), tamanho folgado p/ o token versionado base64url.
    await db.createStringAttribute(DB_ID, 'certificados', 'senhaCofre', 1024, false, '');
    console.log('  ✓ certificados.senhaCofre (string)');
  } catch (e) {
    if (jaExiste(e)) console.log('  ~ certificados.senhaCofre já existe');
    else console.error('  ✗ senhaCofre:', e.message?.slice(0, 100));
  }
  await sleep(500);
}

function senhaDoEnv(empresaId) {
  const especifica = `CERT_SENHA_${String(empresaId).toUpperCase()}`;
  return process.env[especifica] ?? process.env.CERT_SENHA ?? '';
}

async function converterSenhas() {
  console.log('\n▶ 2) Conversão env → ciphertext (opcional)');
  if (!process.env.CERT_MASTER_KEY) {
    console.log('  ~ CERT_MASTER_KEY ausente — pulando conversão (configure e reenvie os A1 pela tela).');
    return;
  }
  let cursor = null;
  let convertidos = 0;
  let semEnv = 0;
  let jaCifrados = 0;
  for (;;) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const r = await db.listDocuments(DB_ID, 'certificados', queries);
    const docs = r.documents || [];
    for (const cert of docs) {
      if (ehTokenCofre(cert.senhaCofre)) { jaCifrados++; continue; }
      const senha = senhaDoEnv(cert.empresaId);
      if (!senha) { semEnv++; continue; }
      try {
        await db.updateDocument(DB_ID, 'certificados', cert.$id, { senhaCofre: cifrar(senha, process.env) });
        convertidos++;
      } catch (e) {
        console.error(`  ✗ ${cert.$id}: ${e.message?.slice(0, 80)}`);
      }
      await sleep(150);
    }
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  console.log(`  ✓ ${convertidos} convertidos, ${jaCifrados} já cifrados, ${semEnv} sem senha em env (reenviar pela tela)`);
}

async function main() {
  console.log('=== Migração Etapa 3 — cofre de senha do A1 (idempotente) ===');
  console.log(`DB: ${DB_ID} | Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
  await addSenhaCofre();
  await converterSenhas();
  console.log('\n✓ Migração concluída.');
}

main().catch((e) => {
  console.error('Falha na migração:', e);
  process.exit(1);
});
