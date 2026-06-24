'use strict';

const { Client, Databases, Storage, Teams } = require('node-appwrite');
const { processarUpload } = require('../_shared/certificado/upload-certificado');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: certificado-upload.
 *
 * Recebe o .pfx do A1 (base64) + a senha + empresa/tenant, valida e guarda tudo
 * de forma segura SERVER-SIDE. A senha NUNCA volta ao cliente nem é persistida
 * em claro — é cifrada com AES-256-GCM (CERT_MASTER_KEY) e só o ciphertext vai
 * ao banco. Toda a regra está em `_shared/certificado/upload-certificado.js`
 * (testada offline); aqui é só a camada de transporte/injeção.
 *
 * Entrada (JSON no corpo):
 *   { empresaId, tenantId, pfxBase64, senha, nomeArquivo? }
 *
 * Saída:
 *   { ok: true, certificadoId, metadados }            (sem senha/chave)
 *   { ok: false, erro, codigo }
 *
 * Variáveis de ambiente (Function): APPWRITE_FUNCTION_API_ENDPOINT,
 *   APPWRITE_FUNCTION_PROJECT_ID, APPWRITE_DB_ID, CERT_BUCKET_ID,
 *   CERT_MASTER_KEY (32 bytes base64/hex — chave mestra do cofre de senhas),
 *   e a API key (header x-appwrite-key).
 */
module.exports = async ({ req, res, error }) => {
  const logger = criarLogger('fn:certificado-upload');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { empresaId, tenantId, pfxBase64, senha, nomeArquivo } = corpo;
    if (!empresaId || !tenantId || !pfxBase64 || !senha) {
      return res.json({ ok: false, erro: 'empresaId, tenantId, pfxBase64 e senha são obrigatórios', codigo: 'DADOS_AUSENTES' }, 400);
    }
    if (!process.env.CERT_MASTER_KEY) {
      logger.error('CERT_MASTER_KEY não configurada na Function');
      return res.json({ ok: false, erro: 'Cofre de senhas não configurado', codigo: 'MASTER_KEY_AUSENTE' }, 500);
    }

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY;
    const dbId = process.env.APPWRITE_DB_ID;
    const bucketId = process.env.CERT_BUCKET_ID || 'certificados-a1';
    const usuarioId = req.headers['x-appwrite-user-id'] || 'sistema';

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    // Defesa em profundidade: o chamador precisa ser MEMBRO do Team (tenant).
    // A regra de negócio (CNPJ × empresa, vencimento) já está na orquestração;
    // aqui barramos quem não pertence ao escritório antes de qualquer escrita.
    if (usuarioId && usuarioId !== 'sistema') {
      const ok = await ehMembro(new Teams(client), tenantId, usuarioId, logger);
      if (!ok) {
        return res.json({ ok: false, erro: 'usuário não pertence ao escritório (tenant)', codigo: 'NAO_AUTORIZADO' }, 403);
      }
    }

    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    const resultado = await processarUpload(
      { databases, storage, dbId, bucketId, env: process.env, logger },
      { empresaId, tenantId, pfxBuffer, senha, usuario: usuarioId, nomeArquivo },
    );

    return res.json({ ok: true, certificadoId: resultado.certificadoId, metadados: resultado.metadados });
  } catch (e) {
    const codigo = e.codigo || 'ERRO';
    const status =
      ['DADOS_AUSENTES', 'PFX_INVALIDO', 'CNPJ_DIVERGENTE', 'CERT_VENCIDO', 'CERT_SEM_CNPJ', 'EMPRESA_SEM_CNPJ'].includes(codigo) ? 400
      : ['NAO_AUTORIZADO', 'TENANT_DIVERGENTE'].includes(codigo) ? 403
      : 500;
    error?.(e.message);
    logger.error('Falha no upload de certificado', { erro: e.message, codigo });
    return res.json({ ok: false, erro: e.message, codigo }, status);
  }
};

/** O usuário é membro do Team (tenant)? Falha de verificação = nega (fail-closed). */
async function ehMembro(teams, tenantId, usuarioId, logger) {
  try {
    const lista = await teams.listMemberships(tenantId);
    return (lista.memberships || []).some((m) => m.userId === usuarioId && m.confirm !== false);
  } catch (e) {
    logger.warn('Falha ao verificar pertencimento ao Team', { tenantId, erro: e.message });
    return false;
  }
}
