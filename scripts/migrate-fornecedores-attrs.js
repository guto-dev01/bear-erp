// Migração idempotente: adiciona à collection `fornecedores` os atributos que a
// tela redesenhada usa (nome fantasia/razão social separados, PIX e dados bancários).
// Seguros porque são todos OPCIONAIS — não invalidam documentos/seed existentes.
//
//   node scripts/migrate-fornecedores-attrs.js
//
// Usa as credenciais do .env da raiz (APPWRITE_ENDPOINT/PROJECT_ID/API_KEY/DB_ID).

const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
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
const DB_ID = process.env.APPWRITE_DB_ID;
if (!API_KEY || !DB_ID) { console.error('❌ APPWRITE_API_KEY / APPWRITE_DB_ID ausentes no .env'); process.exit(1); }

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(API_KEY);
const db = new Databases(client);

const COLLECTION = 'fornecedores';
const attrs = [
  { key: 'razaoSocial', size: 255 },
  { key: 'nomeFantasia', size: 255 },
  { key: 'chavePix', size: 255 },
  { key: 'banco', size: 100 },
  { key: 'agencia', size: 20 },
  { key: 'conta', size: 30 },
];

(async () => {
  console.log(`▶ Migrando atributos de '${COLLECTION}' em DB ${DB_ID}`);
  for (const a of attrs) {
    try {
      await db.createStringAttribute(DB_ID, COLLECTION, a.key, a.size, false, '');
      console.log(`  ✓ adicionado: ${a.key} (string ${a.size}, opcional)`);
    } catch (e) {
      if (e.code === 409) console.log(`  • já existe: ${a.key}`);
      else { console.error(`  ✗ falha em ${a.key}:`, e.message); process.exitCode = 1; }
    }
  }
  console.log('✔ Concluído.');
})();
