/**
 * Migração focada: adiciona à coleção `empresas` os campos de identificação
 * (NIRE, código IBGE, natureza jurídica, CNAE, etc.), endereço estruturado e
 * contabilista/responsável (usados nos termos dos livros e na ECD).
 *
 * Seguro para base em produção: NÃO recria a coleção, NÃO toca em documentos
 * existentes e PULA atributos que já existem (idempotente — pode rodar de novo).
 *
 * Uso:  cd bear-erp/scripts && node migrate-empresa-fields.js
 * Requer no .env da raiz: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
 *                          APPWRITE_API_KEY, APPWRITE_DB_ID
 */
const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

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
const DB_ID = process.env.APPWRITE_DB_ID;
if (!API_KEY || !DB_ID || !process.env.APPWRITE_PROJECT_ID) {
  console.error('❌ Faltam variáveis no .env: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DB_ID.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(API_KEY);
const db = new Databases(client);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const COLLECTION = 'empresas';

// Apenas os campos NOVOS. Strings opcionais (default ''), não obrigatórios.
const NOVOS_ATRIBUTOS = [
  { key: 'nire', size: 20 },
  { key: 'naturezaJuridica', size: 20 },
  { key: 'cnae', size: 15 },
  { key: 'codigoMunicipio', size: 10 },
  { key: 'tipoEstabelecimento', size: 10 },
  { key: 'dataInicioAtividades', size: 10 },
  { key: 'capitalSocial', size: 20 },
  { key: 'numero', size: 20 },
  { key: 'complemento', size: 100 },
  { key: 'bairro', size: 100 },
  { key: 'contadorNome', size: 150 },
  { key: 'contadorCpf', size: 11 },
  { key: 'contadorCrc', size: 20 },
  { key: 'contadorCrcUf', size: 2 },
  { key: 'responsavelNome', size: 150 },
  { key: 'responsavelCpf', size: 11 },
  { key: 'responsavelQualificacao', size: 30 },
];

async function main() {
  console.log(`\n🏢 Migrando coleção "${COLLECTION}" — ${NOVOS_ATRIBUTOS.length} atributos\n`);

  // Confere que a coleção existe antes de mexer.
  try {
    await db.getCollection(DB_ID, COLLECTION);
  } catch (e) {
    console.error(`❌ Coleção "${COLLECTION}" não encontrada (${e.message?.substring(0, 80)}). Rode o appwrite-setup.js primeiro.`);
    process.exit(1);
  }

  let criados = 0, existentes = 0, erros = 0;
  for (const attr of NOVOS_ATRIBUTOS) {
    try {
      // string, opcional, default '' (xdefault só é aceito quando required=false)
      await db.createStringAttribute(DB_ID, COLLECTION, attr.key, attr.size, false, '', false);
      console.log(`  ✓ criado: ${attr.key} (string ${attr.size})`);
      criados++;
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log(`  ~ já existe: ${attr.key}`);
        existentes++;
      } else {
        console.error(`  ✗ erro em ${attr.key}: ${e.message?.substring(0, 90)}`);
        erros++;
      }
    }
    await sleep(350); // criação de atributo é assíncrona no Appwrite
  }

  console.log(`\n✅ Concluído — ${criados} criado(s), ${existentes} já existia(m), ${erros} erro(s).`);
  console.log('   Os atributos podem levar alguns segundos até ficarem "available".\n');
  if (erros > 0) process.exit(1);
}

main().catch((e) => { console.error('Falha inesperada:', e); process.exit(1); });
