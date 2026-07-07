'use strict';

const path = require('path');
const fs = require('fs');
const { Client, Databases, Storage } = require('node-appwrite');
const { AppwriteStorageVault } = require('../_shared/cofre/appwrite-storage-vault');
const { transmitirNfe, statusServico } = require('../_shared/nfe/transmissao');
const { baixarNovos, manifestarDestinatario } = require('../_shared/nfe/importacao');
const { criarLogger } = require('../_shared/log/logger');

// CA do servidor da SEFAZ (ICP-Brasil / AC SOLUTI) empacotada com a função em
// ./certs/sefaz-ca.pem. Resolvida por __dirname (robusto a cwd) e exposta via
// NODE_EXTRA_CA_CERTS, que o cliente SOAP usa como âncora de confiança no
// handshake mTLS. Sem isso, o TLS com a SEFAZ falha (unable to get local issuer).
// Sobrescrevível por uma NODE_EXTRA_CA_CERTS já definida no ambiente.
if (!process.env.NODE_EXTRA_CA_CERTS) {
  const caSefaz = path.join(__dirname, 'certs', 'sefaz-ca.pem');
  if (fs.existsSync(caSefaz)) process.env.NODE_EXTRA_CA_CERTS = caSefaz;
}

/**
 * Appwrite Function: nfe-transmissao.
 *
 * Camada fina — injeta SDK + cofre (A1 do Storage) e delega ao orquestrador
 * testado em `_shared/nfe/transmissao.js`. Nenhuma regra de negócio aqui.
 *
 * Entrada (JSON no corpo):
 *   { empresaId, uf, ambiente?: 'homologacao'|'producao',
 *     operacao?: 'autorizar'|'status'|'distribuir'|'manifestar', xmlNFe?, idLote?,
 *     cnpjCpf?, ultNSU?, chave?, tpEvento?, xJust? }
 *   - 'autorizar' (padrão): exige xmlNFe (gerado no front por gerarXmlNotaFiscal).
 *   - 'status': "ping" do serviço (valida A1 + mTLS sem mandar nota).
 *   - 'distribuir': baixa NF-e de ENTRADA via Distribuição DF-e (loop de NSU);
 *     opcional ultNSU (padrão 0) e cnpjCpf (padrão: o do certificado).
 *   - 'manifestar': Manifestação do Destinatário; exige chave e tpEvento
 *     (210200/210210/210220/210240); xJust obrigatório na 210240.
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
    const {
      empresaId, uf, ambiente = 'homologacao', operacao = 'autorizar', xmlNFe, idLote,
      cnpjCpf, ultNSU, chave, tpEvento, xJust,
    } = corpo;
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

    // NUNCA estrito na NF-e: o modo estrito valida a cadeia SECTIGO, exigência
    // do eSocial 2026 — irrelevante para a SEFAZ, cuja confiança é ICP-Brasil/
    // SERPRO (sefaz-ca.pem via NODE_EXTRA_CA_CERTS + an-ca.pem + raízes públicas).
    // Com estrito em produção, o gate derrubava toda operação NF-e com "Trust
    // store Sectigo incompleto" antes de sequer tentar o handshake com a SEFAZ.
    const truststoreEstrito = false;

    if (operacao === 'status') {
      const r = await statusServico({ cofre, empresaId, uf, ambiente, truststoreEstrito });
      logger.info('Status do serviço consultado', { empresaId, uf, online: r.online });
      return res.json({ ok: true, ...r });
    }

    if (operacao === 'distribuir') {
      const r = await baixarNovos({ cofre, empresaId, uf, cnpjCpf, ultNSU: ultNSU ?? '0', ambiente, truststoreEstrito });
      logger.info('Distribuição DF-e', { empresaId, uf, baixados: r.documentos.length, ultNSU: r.ultNSU });
      return res.json({ ok: true, ...r });
    }

    if (operacao === 'manifestar') {
      if (!chave || !tpEvento) {
        return res.json({ ok: false, erro: 'chave e tpEvento são obrigatórios para manifestar' }, 400);
      }
      const r = await manifestarDestinatario({ cofre, empresaId, chave, cnpj: cnpjCpf, tpEvento, xJust, ambiente, truststoreEstrito });
      logger.info('Manifestação', { empresaId, chave, tpEvento, cStat: r.cStat });
      return res.json({ ok: true, ...r });
    }

    if (!xmlNFe) {
      return res.json({ ok: false, erro: 'xmlNFe é obrigatório para autorizar' }, 400);
    }
    const r = await transmitirNfe({ cofre, empresaId, uf, xmlNFe, ambiente, idLote, truststoreEstrito });
    logger.info('NF-e processada', { empresaId, uf, situacao: r.situacao, nProt: r.nProt });
    return res.json({ ok: true, ...r });
  } catch (e) {
    error?.(e.message);
    logger.error('Falha na transmissão da NF-e', { erro: e.message });
    return res.json({ ok: false, erro: e.message }, 500);
  }
};
