#!/usr/bin/env node
'use strict';

/**
 * Servidor local para rodar as Appwrite Functions (certificado-upload + nfe-transmissao)
 * como HTTP endpoints. Usa o SDK real do Appwrite apontando pro projeto na nuvem.
 *
 * Uso:
 *   node scripts/dev/run-functions-local.js
 *
 * Requer .env com: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 * APPWRITE_DB_ID, CERT_MASTER_KEY, CERT_BUCKET_ID (opcional, default certificados-a1)
 *
 * Endpoints expostos:
 *   POST http://localhost:3001/fn/certificado-upload
 *     { empresaId, tenantId, pfxBase64, senha, nomeArquivo? }
 *
 *   POST http://localhost:3001/fn/nfe-transmissao
 *     { empresaId, uf, ambiente?, operacao?, xmlNFe?, idLote?, cnpjCpf?, ultNSU?, chave?, tpEvento?, xJust? }
 *     operacao: 'autorizar' | 'status' | 'distribuir' | 'manifestar'
 *
 * Frontend (environment.ts) deve apontar para:
 *   functions: { certificadoUpload: 'http://localhost:3001/fn/certificado-upload', nfeTransmissao: 'http://localhost:3001/fn/nfe-transmissao' }
 *   (ou usar proxy.conf.json do Angular para reescrever /api/fn/* → localhost:3001/fn/*)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const { Client, Databases, Storage, Teams } = require('node-appwrite');
const { criarLogger } = require('../../functions/_shared/log/logger.js');

const PORT = process.env.FUNCTIONS_LOCAL_PORT || 3001;
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DB_ID;
const MASTER_KEY = process.env.CERT_MASTER_KEY;
const BUCKET_ID = process.env.CERT_BUCKET_ID || 'certificados-a1';

if (!PROJECT || !API_KEY || !DB_ID || !MASTER_KEY) {
  console.error('❌ Variáveis obrigatórias no .env: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DB_ID, CERT_MASTER_KEY');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const logger = criarLogger('functions-local');

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const teams = new Teams(client);

// Injetar dependências nos handlers originais
const certificadoUploadHandler = require('../../functions/certificado-upload/index.js');
const nfeTransmissaoHandler = require('../../functions/nfe-transmissao/index.js');

// Wrapper para adaptar Express req/res → Appwrite Function context
function createContext(req, res) {
  return {
    req: {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    },
    res: {
      json: (data, status = 200) => res.status(status).json(data),
      send: (data, status = 200) => res.status(status).send(data),
      status: (code) => ({ json: (d) => res.status(code).json(d), send: (d) => res.status(code).send(d) }),
    },
    log: (msg, meta) => logger.info(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
  };
}

// Rotas
app.post('/fn/certificado-upload', async (req, res) => {
  const ctx = createContext(req, res);
  try {
    await certificadoUploadHandler(ctx);
  } catch (e) {
    logger.error('Erro não tratado em certificado-upload', { erro: e.message, stack: e.stack });
    if (!res.headersSent) res.status(500).json({ ok: false, erro: 'Erro interno no handler' });
  }
});

app.post('/fn/nfe-transmissao', async (req, res) => {
  const ctx = createContext(req, res);
  try {
    await nfeTransmissaoHandler(ctx);
  } catch (e) {
    logger.error('Erro não tratado em nfe-transmissao', { erro: e.message, stack: e.stack });
    if (!res.headersSent) res.status(500).json({ ok: false, erro: 'Erro interno no handler' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'bear-erp-functions-local', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Bear ERP — Functions Local (Express)                       ║
╠══════════════════════════════════════════════════════════════╣
║  📡 Servidor rodando em: http://localhost:${PORT}              ║
║                                                             ║
║  Endpoints:                                                 ║
║    POST /fn/certificado-upload   → upload A1 ao cofre       ║
║    POST /fn/nfe-transmissao      → NF-e (autorizar/status/  ║
║                                     distribuir/manifestar)  ║
║    GET  /health                  → health check             ║
║                                                             ║
║  Frontend (environment.ts):                                 ║
║    functions: {                                              ║
║      certificadoUpload: 'http://localhost:${PORT}/fn/certificado-upload', ║
║      nfeTransmissao: 'http://localhost:${PORT}/fn/nfe-transmissao'      ║
║    }                                                        ║
║                                                             ║
║  Ou use proxy.conf.json do Angular:                         ║
║    "/api/fn/*": { "target": "http://localhost:${PORT}", "pathRewrite": { "^/api/fn": "/fn" } } ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando...');
  process.exit(0);
});