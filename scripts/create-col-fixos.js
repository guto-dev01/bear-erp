// Cria a coleção `lancamentos_fixos` (modelos de lançamentos recorrentes).
// Idempotente: ignora "already exists". Usa as mesmas permissões "somente logados".
const { Client, Databases, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
for (const l of fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const t = l.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i < 0) continue;
  const k = t.slice(0, i).trim(); if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
}
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));
const DB = process.env.APPWRITE_DB_ID;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PERMS = [Permission.read(Role.users()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())];
const COL = { id: 'lancamentos_fixos', name: 'Lancamentos Fixos', attrs: [
  { key: 'historico', type: 'string', size: 500, required: true },
  { key: 'contaDebitoId', type: 'string', size: 50, required: true },
  { key: 'contaCreditoId', type: 'string', size: 50, required: true },
  { key: 'contaDebitoCodigo', type: 'string', size: 20, required: false },
  { key: 'contaCreditoCodigo', type: 'string', size: 20, required: false },
  { key: 'valor', type: 'float', required: true },
  { key: 'diaVencimento', type: 'integer', required: false },
  { key: 'tipo', type: 'string', size: 20, required: false },
  { key: 'ativo', type: 'boolean', required: false },
  { key: 'vigenciaInicio', type: 'string', size: 7, required: false },
  { key: 'vigenciaFim', type: 'string', size: 7, required: false },
  { key: 'empresaId', type: 'string', size: 50, required: true },
  { key: 'tenantId', type: 'string', size: 50, required: true },
  { key: 'createdAt', type: 'string', size: 30, required: false },
]};

(async () => {
  try {
    await db.createCollection(DB, COL.id, COL.name, PERMS);
    console.log(`✓ Collection criada: ${COL.name}`);
  } catch (e) {
    if (e.message?.includes('already exists')) { console.log(`~ Collection já existe: ${COL.name}`); }
    else { console.error('✗ Erro collection:', e.message); process.exit(1); }
  }
  for (const a of COL.attrs) {
    try {
      const req = !!a.required;
      if (a.type === 'string') await db.createStringAttribute(DB, COL.id, a.key, a.size, req, req ? undefined : '', false);
      else if (a.type === 'integer') await db.createIntegerAttribute(DB, COL.id, a.key, req, undefined, undefined, req ? undefined : 0, false);
      else if (a.type === 'float') await db.createFloatAttribute(DB, COL.id, a.key, req, undefined, undefined, req ? undefined : 0, false);
      else if (a.type === 'boolean') await db.createBooleanAttribute(DB, COL.id, a.key, req, req ? undefined : false, false);
      console.log(`  + attr ${a.key} (${a.type})`);
      await sleep(350);
    } catch (e) {
      if (e.message?.includes('already exists')) console.log(`  ~ attr ${a.key} já existe`);
      else console.error(`  ✗ attr ${a.key}:`, e.message?.substring(0, 90));
    }
  }
  console.log('\n✅ Coleção lancamentos_fixos pronta.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
