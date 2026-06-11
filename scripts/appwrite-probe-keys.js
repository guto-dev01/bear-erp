'use strict';

/**
 * Diagnóstico: para cada API key listada em /tmp/bear-keys.txt, testa contra o projeto
 * (endpoint/projectId do .env) quais serviços/escopos a chave possui. Não modifica nada.
 */

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

// .env (endpoint/project)
const envPath = path.join(__dirname, '..', '.env');
for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID;

const keys = fs.readFileSync('/tmp/bear-keys.txt', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

const PROBES = [
  ['databases (databases.read)', (c) => new sdk.Databases(c).list()],
  ['functions (functions.read)', (c) => new sdk.Functions(c).list()],
  ['users     (users.read)',     (c) => new sdk.Users(c).list()],
  ['storage   (buckets.read)',   (c) => new sdk.Storage(c).listBuckets()],
  ['teams     (teams.read)',     (c) => new sdk.Teams(c).list()],
  ['messaging (targets/topics.read)', (c) => new sdk.Messaging(c).listTopics()],
];

const semScope = (msg) => {
  const m = msg.match(/missing scopes \(\[([^\]]*)\]\)/);
  return m ? m[1].replace(/"/g, '') : null;
};

(async () => {
  for (const key of keys) {
    const idtag = `…${key.slice(-6)}`;
    const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(key);
    console.log(`\n══ KEY ${idtag} (projeto ${PROJECT}) ══`);
    let validaNoProjeto = false;
    for (const [nome, fn] of PROBES) {
      try {
        const r = await fn(client);
        validaNoProjeto = true;
        const total = (r && typeof r.total === 'number') ? ` (total: ${r.total})` : '';
        console.log(`  ✓ ${nome}${total}`);
      } catch (e) {
        const falta = semScope(e.message || '');
        if (falta !== null) {
          validaNoProjeto = true; // a chave é válida no projeto, só não tem o escopo
          console.log(`  ✗ ${nome} — sem escopo (${falta || 'desconhecido'})`);
        } else {
          console.log(`  ! ${nome} — ${e.message} ${e.code ? '(code ' + e.code + ')' : ''}`);
        }
      }
    }
    console.log(`  → ${validaNoProjeto ? 'CHAVE VÁLIDA neste projeto' : 'NÃO autenticou neste projeto (chave inválida ou de outro projeto)'}`);
  }
})();
