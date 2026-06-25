'use strict';
/**
 * Deploy da Function `nfe-transmissao` (assina o A1 do cofre + mTLS → SEFAZ).
 *
 * Por padrão CRIA a função com o ID `nfe-transmissao` (o mesmo que o frontend usa
 * em environment.ts → functions.nfeTransmissao). Se o plano Appwrite recusar mais
 * uma função, rode reaproveitando um slot existente:
 *
 *   NFE_FN_ID=<slot-existente> node scripts/deploy-nfe-transmissao.js
 *   (e ajuste frontend-angular/src/environments/environment*.ts → nfeTransmissao)
 *
 *   node scripts/deploy-nfe-transmissao.js
 *
 * .env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DB_ID,
 *       CERT_MASTER_KEY. Opcional: CERT_BUCKET_ID (default certificados-a1),
 *       SEFAZ_CA_PEM (caminho do .pem com a raiz ICP-Brasil → vira NODE_EXTRA_CA_CERTS).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sdk = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');

const envPath = path.join(__dirname, '..', '.env');
for (const linha of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DB_ID;
const MASTER = process.env.CERT_MASTER_KEY;
const BUCKET = process.env.CERT_BUCKET_ID || 'certificados-a1';
const RUNTIME = process.env.APPWRITE_NODE_RUNTIME || 'node-22';
const FUNCTIONS_DIR = path.join(__dirname, '..', 'functions');
const TARBALL = path.join(require('os').tmpdir(), 'nfe-transmissao-deploy.tar.gz');

// Plano Appwrite limita funções → reaproveita o slot do cofre (ocr-cadastro) com
// um dispatcher (fiscal-cofre) que roteia upload-do-A1 ↔ transmissão-NF-e.
const FN_ID = process.env.NFE_FN_ID || 'ocr-cadastro';
const ENTRY = 'fiscal-cofre/index.js';
// União dos scopes dos dois handlers (upload escreve; NF-e só lê).
const SCOPES = ['databases.read', 'documents.read', 'documents.write', 'files.read', 'files.write', 'buckets.read', 'teams.read'];
const VARS = { APPWRITE_DB_ID: DB_ID, CERT_BUCKET_ID: BUCKET, CERT_MASTER_KEY: MASTER };

// Raiz da SEFAZ (ICP-Brasil) opcional — necessária p/ o handshake TLS real.
if (process.env.SEFAZ_CA_PEM) VARS.NODE_EXTRA_CA_CERTS = process.env.SEFAZ_CA_PEM;

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const functions = new sdk.Functions(client);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!PROJECT || !KEY || !DB_ID || !MASTER) {
    console.error('Faltam APPWRITE_PROJECT_ID / APPWRITE_API_KEY / APPWRITE_DB_ID / CERT_MASTER_KEY no .env');
    process.exit(1);
  }

  const base = {
    name: 'Fiscal: Cofre A1 + NF-e', runtime: RUNTIME, execute: ['users'],
    entrypoint: ENTRY, commands: 'npm install', timeout: 120, logging: true,
  };

  // 1) Garante que a função existe (cria com o ID, ou reaproveita o slot informado).
  let existe = true;
  try {
    const atual = await functions.get({ functionId: FN_ID });
    console.log(`▸ usando função existente '${FN_ID}' (era: ${atual.name})`);
  } catch {
    existe = false;
  }
  if (!existe) {
    try {
      await functions.create({ functionId: FN_ID, ...base, scopes: SCOPES });
      console.log(`▸ função '${FN_ID}' criada`);
    } catch (e) {
      console.error(`\n✗ Não consegui criar a função '${FN_ID}': ${e.message}`);
      console.error('  Se o plano Appwrite limita funções, reaproveite um slot existente:');
      console.error('    NFE_FN_ID=<slot> node scripts/deploy-nfe-transmissao.js');
      console.error('  e ajuste environment.ts → functions.nfeTransmissao para esse slot.');
      process.exit(1);
    }
  }

  // 2) Atualiza config + scopes (com fallback p/ chave estática se o plano não suportar scopes).
  try {
    await functions.update({ functionId: FN_ID, ...base, scopes: SCOPES });
    console.log('  ✓ função configurada (scopes p/ chave dinâmica)');
  } catch (e) {
    console.log(`  ! update com scopes falhou (${e.message}); usando APPWRITE_API_KEY na env`);
    await functions.update({ functionId: FN_ID, ...base });
    VARS.APPWRITE_API_KEY = KEY;
  }

  // 3) Variáveis (idempotente).
  const { variables } = await functions.listVariables({ functionId: FN_ID });
  for (const [k, v] of Object.entries(VARS)) {
    const ex = variables.find((x) => x.key === k);
    try {
      if (ex) await functions.updateVariable({ functionId: FN_ID, variableId: ex.$id, key: k, value: v });
      else await functions.createVariable({ functionId: FN_ID, key: k, value: v });
      console.log(`  ✓ var ${k}`);
    } catch (e) { console.log(`  ! var ${k}: ${e.message}`); }
  }
  if (!VARS.NODE_EXTRA_CA_CERTS) {
    console.log('  ⚠ NODE_EXTRA_CA_CERTS não definida — o handshake TLS real com a SEFAZ vai falhar');
    console.log('    até instalar a raiz ICP-Brasil v10 (rode com SEFAZ_CA_PEM=<caminho .pem>).');
  }

  // 4) Empacota functions/ (inclui _shared) e publica.
  console.log('▸ empacotando functions/ e publicando deployment…');
  execSync(`tar -czf "${TARBALL}" -C "${FUNCTIONS_DIR}" --exclude=node_modules --exclude=.git .`);
  const dep = await functions.createDeployment({
    functionId: FN_ID, code: InputFile.fromPath(TARBALL, 'code.tar.gz'),
    activate: true, entrypoint: ENTRY, commands: 'npm install',
  });
  process.stdout.write(`  build ${dep.$id} `);
  let ok = false;
  for (let i = 0; i < 150; i++) {
    const d = await functions.getDeployment({ functionId: FN_ID, deploymentId: dep.$id });
    if (d.status === 'ready') { console.log('→ ready ✓'); ok = true; break; }
    if (d.status === 'failed') { console.log('→ FAILED ✗'); console.log((d.buildLogs || '').slice(-3000)); break; }
    process.stdout.write('.');
    await sleep(4000);
  }
  try { fs.unlinkSync(TARBALL); } catch (_) {}
  console.log(ok
    ? `\n✅ Deploy OK. Frontend já aponta functions.nfeTransmissao = '${FN_ID}'. Recarregue e clique "Status SEFAZ".`
    : '\n✗ Deploy não concluiu.');
})().catch((e) => {
  console.error('\n✗ Erro no deploy:', e.message, e.code ? `(code ${e.code})` : '');
  try { fs.unlinkSync(TARBALL); } catch (_) {}
  process.exit(1);
});
