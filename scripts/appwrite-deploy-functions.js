'use strict';

/**
 * Deploy das Appwrite Functions da migração (OCR, CNPJ, CPF) usando a API key admin
 * do .env. Idempotente: cria a função se não existir, senão só publica novo deployment.
 *
 *   node scripts/appwrite-deploy-functions.js
 *
 * Lê do .env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, CPF_API_TOKEN.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sdk = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');

// ── .env (mesmo parsing dos outros scripts) ──
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const KEY = process.env.APPWRITE_API_KEY;
const CPF_TOKEN = process.env.CPF_API_TOKEN || '';
const CPF_URL = process.env.CPF_API_URL || '';

if (!PROJECT || !KEY) {
  console.error('Faltam APPWRITE_PROJECT_ID / APPWRITE_API_KEY no .env');
  process.exit(1);
}

const FUNCTIONS_DIR = path.join(__dirname, '..', 'functions');
const TARBALL = path.join(require('os').tmpdir(), 'bear-deploy-code.tar.gz');

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const functions = new sdk.Functions(client);

const DEFS = [
  { id: 'ocr-cadastro', name: 'OCR Cadastro', entrypoint: 'ocr-cadastro/index.js',
    vars: { OCR_LANGUAGE: 'por', OCR_MIN_TEXT: '40' } },
  // Função única para CPF + CNPJ (o plano Appwrite limita o nº de funções).
  { id: 'consulta-cnpj', name: 'Consultas Receita (CPF/CNPJ)', entrypoint: 'consulta-cnpj/index.js',
    vars: { CPF_API_TOKEN: CPF_TOKEN, ...(CPF_URL ? { CPF_API_URL: CPF_URL } : {}) } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function escolherRuntimeNode() {
  // listRuntimes exige escopo "public" que a API key não tem; fixamos o runtime
  // (override via APPWRITE_NODE_RUNTIME). functions.create avisa se o runtime não existir.
  // node-22: o OCR de PDF usa pdfjs-dist/pdf-to-png-converter, que exigem Node >= 20.
  return process.env.APPWRITE_NODE_RUNTIME || 'node-22';
}

async function garantirFuncao(def, runtime) {
  try {
    const atual = await functions.get({ functionId: def.id });
    console.log(`  • função '${def.id}' já existe — atualizando deployment`);
    if (atual.runtime !== runtime) {
      console.log(`    ↑ migrando runtime ${atual.runtime} → ${runtime}`);
      await functions.update({
        functionId: def.id,
        name: atual.name,
        runtime,
        execute: atual.execute,
        entrypoint: def.entrypoint,
        commands: 'npm install',
        timeout: atual.timeout || 120,
        logging: true,
      });
    }
  } catch (e) {
    if (e.code !== 404) throw e;
    console.log(`  • criando função '${def.id}' (${runtime})`);
    await functions.create({
      functionId: def.id,
      name: def.name,
      runtime,
      execute: ['users'],          // só usuários autenticados executam
      entrypoint: def.entrypoint,
      commands: 'npm install',
      timeout: 120,
      logging: true,
    });
  }
}

async function setVariaveis(def) {
  if (!Object.keys(def.vars).length) return;
  const { variables } = await functions.listVariables({ functionId: def.id });
  for (const [key, value] of Object.entries(def.vars)) {
    if (value === '' && key === 'CPF_API_TOKEN') {
      console.log(`    ! ${key} vazio — pulei (configure depois no console)`);
      continue;
    }
    const existente = variables.find((v) => v.key === key);
    if (existente) {
      await functions.updateVariable({ functionId: def.id, variableId: existente.$id, key, value });
    } else {
      await functions.createVariable({ functionId: def.id, key, value });
    }
    console.log(`    ✓ var ${key}`);
  }
}

async function publicar(def) {
  const dep = await functions.createDeployment({
    functionId: def.id,
    code: InputFile.fromPath(TARBALL, 'code.tar.gz'),
    activate: true,
    entrypoint: def.entrypoint,
    commands: 'npm install',
  });
  process.stdout.write(`    build ${dep.$id} `);
  // poll
  for (let i = 0; i < 90; i++) {
    const d = await functions.getDeployment({ functionId: def.id, deploymentId: dep.$id });
    if (d.status === 'ready') { console.log('→ ready ✓'); return; }
    if (d.status === 'failed') { console.log('→ FAILED ✗'); console.log(d.buildLogs?.slice(-1500) || ''); return; }
    process.stdout.write('.');
    await sleep(4000);
  }
  console.log(' → timeout (build ainda rodando)');
}

(async () => {
  console.log('Empacotando functions/ …');
  execSync(`tar -czf "${TARBALL}" -C "${FUNCTIONS_DIR}" --exclude=node_modules --exclude=.git .`);
  const runtime = await escolherRuntimeNode();
  console.log(`Runtime: ${runtime}\n`);

  // Filtro opcional por argv: `node ... consulta-cnpj ocr-cadastro`
  const filtro = process.argv.slice(2);
  const defs = filtro.length ? DEFS.filter((d) => filtro.includes(d.id)) : DEFS;

  for (const def of defs) {
    console.log(`▸ ${def.id}`);
    await garantirFuncao(def, runtime);
    await setVariaveis(def);
    await publicar(def);
  }

  fs.unlinkSync(TARBALL);
  console.log('\n✅ Deploy concluído.');
})().catch((e) => {
  console.error('\n✗ Erro no deploy:', e.message, e.code ? `(code ${e.code})` : '');
  try { fs.unlinkSync(TARBALL); } catch (_) {}
  process.exit(1);
});
