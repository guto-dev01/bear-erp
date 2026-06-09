const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Carrega variáveis do .env da raiz do projeto (sem depender de dotenv).
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
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

async function main() {
  const cols = await db.listCollections(DB_ID);
  console.log(`Deletando ${cols.collections.length} collections...`);
  for (const c of cols.collections) {
    await db.deleteCollection(DB_ID, c.$id);
    console.log(`  ✗ ${c.name}`);
  }
  console.log('Limpo!');
}
main().catch(e => console.error(e.message));
