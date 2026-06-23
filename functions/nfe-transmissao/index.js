'use strict';

const { Client, Databases, Storage } = require('node-appwrite');
const { AppwriteStorageVault } = require('../_shared/cofre/appwrite-storage-vault');
const { transmitirNfe, statusServico } = require('../_shared/nfe/transmissao');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: nfe-transmissao.
 *
 * Camada fina — injeta SDK + cofre (A1 do Storage) e delega ao orquestrador
 * testado em `_shared/nfe/transmissao.js`. Nenhuma regra de negócio aqui.
 *
 * Entrada (JSON no corpo):
 *   { empresaId, uf, ambiente?: 'homologacao'|'producao',
 *     operacao?: 'autorizar'|'status', xmlNFe?, idLote? }
 *   - 'autorizar' (padrão): exige xmlNFe (gerado no front por gerarXmlNotaFiscal).
 *   - 'status': "ping" do serviço (valida A1 + mTLS sem mandar nota).
 *
 * Variáveis de ambiente: APPWRITE_FUNCTION_API_ENDPOINT,
 *   APPWRITE_FUNCTION_PROJECT_ID, APPWRITE_DB_ID, CERT_BUCKET_ID,
 *   SECTIGO_TRUSTSTORE_DIR, CERT_SENHA_<empresaId> | CERT_SENHA,
 *   e a API key (header x-appwrite-key).
 */
module.exports = async ({ req, res, log, error }) => {
  const logger = criarLogger('fn:nfe-transmissao');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { empresaId, uf, ambiente = 'homologacao', operacao = 'autorizar', xmlNFe, idLote } = corpo;
    if (!empresaId || !uf) {
      return res.json({ ok: false, erro: 'empresaId e uf são obrigatórios' }, 400);
    }

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY;
    const dbId = process.env.APPWRITE_DB_ID;
    const bucketId = process.env.CERT_BUCKET_ID || 'certificados-a1';

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const cofre = new AppwriteStorageVault({
      storage: new Storage(client),
      databases: new Databases(client),
      bucketId,
      dbId,
    });

    if (operacao === 'status') {
      const r = await statusServico({ cofre, empresaId, uf, ambiente });
      logger.info('Status do serviço consultado', { empresaId, uf, online: r.online });
      return res.json({ ok: true, ...r });
    }

    if (!xmlNFe) {
      return res.json({ ok: false, erro: 'xmlNFe é obrigatório para autorizar' }, 400);
    }
    const r = await transmitirNfe({ cofre, empresaId, uf, xmlNFe, ambiente, idLote });
    logger.info('NF-e processada', { empresaId, uf, situacao: r.situacao, nProt: r.nProt });
    return res.json({ ok: true, ...r });
  } catch (e) {
    error?.(e.message);
    logger.error('Falha na transmissão da NF-e', { erro: e.message });
    return res.json({ ok: false, erro: e.message }, 500);
  }
};
