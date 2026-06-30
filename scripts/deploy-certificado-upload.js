'use strict';
/**
 * Deploy da Function de upload do A1 ao cofre (server-side), REAPROVEITANDO o
 * slot da função obsoleta `ocr-cadastro` — o plano Appwrite limita o nº de
 * funções, e o OCR hoje roda no navegador (a função não é mais chamada).
 *
 * Não cria função nova nem deleta a `consulta-cnpj`. Apenas atualiza o slot
 * `ocr-cadastro` para rodar `certificado-upload/index.js`, define as variáveis
 * e publica o deployment. Reversível: o código da OCR continua no repo.
 *
 *   node scripts/deploy-certificado-upload.js
 *
 * .env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 *       APPWRITE_DB_ID, CERT_MASTER_KEY.
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
const RUNTIME = process.env.APPWRITE_NODE_RUNTIME || 'node-22';
const FUNCTIONS_DIR = path.join(__dirname, '..', 'functions');
const TARBALL = path.join(require('os').tmpdir(), 'cert-upload-deploy.tar.gz');

// Slot reaproveitado (função existente que vamos repropor).
const FN_ID = process.env.CERT_FN_ID || 'ocr-cadastro';
const ENTRY = 'certificado-upload/index.js';
const SCOPES = ['databases.read', 'documents.read', 'documents.write', 'files.read', 'files.write', 'buckets.read', 'teams.read'];
const VARS = { APPWRITE_DB_ID: DB_ID, CERT_BUCKET_ID: 'certificados-a1', CERT_MASTER_KEY: MASTER };

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const functions = new sdk.Functions(client);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!PROJECT || !KEY || !DB_ID || !MASTER) {
    console.error('Faltam APPWRITE_PROJECT_ID / APPWRITE_API_KEY / APPWRITE_DB_ID / CERT_MASTER_KEY no .env');
    process.exit(1);
  }

  const atual = await functions.get({ functionId: FN_ID }); // erro se não existir o slot
  console.log(`▸ reaproveitando slot '${FN_ID}' (era: ${atual.name})`);

  // Atualiza o slot: nome, entrypoint p/ o cert, scopes da chave dinâmica.
  const updateBase = {
    functionId: FN_ID, name: 'Upload Certificado A1', runtime: RUNTIME,
    execute: ['users'], entrypoint: ENTRY, commands: 'npm install',
    timeout: 120, logging: true,
  };
  try {
    await functions.update({ ...updateBase, scopes: SCOPES });
    console.log('  ✓ função atualizada (com scopes p/ chave dinâmica)');
  } catch (e) {
    console.log(`  ! update com scopes falhou (${e.message}); atualizando sem scopes + APPWRITE_API_KEY na env`);
    await functions.update(updateBase);
    VARS.APPWRITE_API_KEY = KEY; // fallback: a função lê process.env.APPWRITE_API_KEY
  }

  // Variáveis (idempotente).
  const { variables } = await functions.listVariables({ functionId: FN_ID });
  for (const [k, v] of Object.entries(VARS)) {
    const ex = variables.find((x) => x.key === k);
    try {
      if (ex) await functions.updateVariable({ functionId: FN_ID, variableId: ex.$id, key: k, value: v });
      else await functions.createVariable({ functionId: FN_ID, key: k, value: v });
      console.log(`  ✓ var ${k}`);
    } catch (e) { console.log(`  ! var ${k}: ${e.message}`); }
  }

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
  console.log(ok ? `\n✅ Deploy OK. Aponte o frontend: functions.certificadoUpload = '${FN_ID}'` : '\n✗ Deploy não concluiu.');
})().catch((e) => {
  console.error('\n✗ Erro no deploy:', e.message, e.code ? `(code ${e.code})` : '');
  try { fs.unlinkSync(TARBALL); } catch (_) {}
  process.exit(1);
});
