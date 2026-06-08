'use strict';

const { Client, Databases, Storage } = require('node-appwrite');
const { AppwriteStorageVault } = require('../_shared/cofre/appwrite-storage-vault');
const { AppwriteEventosRepo } = require('../_shared/esocial/repositorio');
const { transmitirLote } = require('../_shared/esocial/transmissao');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: esocial-enviar-lote.
 *
 * Camada fina — apenas injeta SDK + cofre + repo e delega ao orquestrador
 * testado em `_shared/esocial/transmissao.js`. Nenhuma regra de negócio aqui.
 *
 * Entrada (JSON no corpo):
 *   {
 *     empresaId, grupo,
 *     ideEmpregador: { tpInsc, nrInsc },
 *     ideTransmissor: { tpInsc, nrInsc },
 *     eventos: [ { eventoId, tipoEvento, dados, statusAtual? } ]
 *   }
 *
 * Variáveis de ambiente (Function): APPWRITE_FUNCTION_API_ENDPOINT,
 *   APPWRITE_FUNCTION_PROJECT_ID, APPWRITE_DB_ID, CERT_BUCKET_ID,
 *   ESOCIAL_AMBIENTE, ESOCIAL_VERSAO_LEIAUTE, SECTIGO_TRUSTSTORE_DIR,
 *   CERT_SENHA_<empresaId> | CERT_SENHA, e a API key (header x-appwrite-key).
 */
module.exports = async ({ req, res, log, error }) => {
  const logger = criarLogger('fn:esocial-enviar-lote');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { empresaId, grupo, ideEmpregador, ideTransmissor, eventos } = corpo;
    if (!empresaId || !grupo || !eventos?.length) {
      return res.json({ ok: false, erro: 'empresaId, grupo e eventos são obrigatórios' }, 400);
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

    const resultado = await transmitirLote({
      repo,
      cofre,
      empresaId,
      grupo,
      ideEmpregador,
      ideTransmissor,
      eventos,
    });

    logger.info('Transmissão concluída', { empresaId, protocolo: resultado.protocolo });
    return res.json({ ok: true, ...resultado });
  } catch (e) {
    error?.(e.message);
    logger.error('Falha na transmissão', { erro: e.message });
    return res.json({ ok: false, erro: e.message }, 500);
  }
};
