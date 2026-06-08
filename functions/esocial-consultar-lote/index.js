'use strict';

const { Client, Databases, Storage } = require('node-appwrite');
const { AppwriteStorageVault } = require('../_shared/cofre/appwrite-storage-vault');
const { AppwriteEventosRepo } = require('../_shared/esocial/repositorio');
const { atualizarPorConsulta } = require('../_shared/esocial/transmissao');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: esocial-consultar-lote.
 *
 * Fecha o ciclo assíncrono: consulta o processamento por protocolo e atualiza
 * o estado dos eventos (ACEITO/REJEITADO/PROCESSANDO + recibo/erros). Delega ao
 * orquestrador testado em `_shared/esocial/transmissao.js`.
 *
 * Entrada (JSON): { empresaId, protocolo, eventoIds: [...] }
 *
 * Pode ser chamada pelo front (polling) ou por um cron de Function.
 */
module.exports = async ({ req, res, log, error }) => {
  const logger = criarLogger('fn:esocial-consultar-lote');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { empresaId, protocolo, eventoIds } = corpo;
    if (!empresaId || !protocolo || !eventoIds?.length) {
      return res.json({ ok: false, erro: 'empresaId, protocolo e eventoIds são obrigatórios' }, 400);
    }

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY;
    const dbId = process.env.APPWRITE_DB_ID;
    const bucketId = process.env.CERT_BUCKET_ID || 'certificados-a1';

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    const cofre = new AppwriteStorageVault({ storage, databases, bucketId, dbId });
    const repo = new AppwriteEventosRepo({ databases, dbId });

    const resultado = await atualizarPorConsulta({
      repo,
      cofre,
      empresaId,
      protocolo,
      eventoIds,
    });

    logger.info('Consulta aplicada', { empresaId, protocolo, status: resultado.status });
    return res.json({ ok: true, ...resultado });
  } catch (e) {
    error?.(e.message);
    logger.error('Falha na consulta', { erro: e.message });
    return res.json({ ok: false, erro: e.message }, 500);
  }
};
