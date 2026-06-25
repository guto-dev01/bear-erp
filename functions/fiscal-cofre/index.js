'use strict';

/**
 * Dispatcher de UMA Function (o plano Appwrite limita o nº de funções).
 *
 * Roteia entre dois handlers já existentes e testados isoladamente, pelo formato
 * do corpo da requisição — sem duplicar regra de negócio:
 *   - upload do A1 ao cofre  → certificado-upload/index.js  (tem `pfxBase64`)
 *   - transmissão da NF-e     → nfe-transmissao/index.js     (tem `operacao`/`xmlNFe`/`uf`)
 *
 * Ambos compartilham cofre (Storage) + CERT_MASTER_KEY, então convivem bem no
 * mesmo slot. `require('../nfe-transmissao/index.js')` roda o auto-load da CA da
 * SEFAZ (NODE_EXTRA_CA_CERTS via __dirname daquele módulo).
 */
const certificadoUpload = require('../certificado-upload/index.js');
const nfeTransmissao = require('../nfe-transmissao/index.js');

module.exports = async (ctx) => {
  const { req } = ctx;
  let corpo = {};
  try {
    corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (_) { /* corpo inválido → cai no upload, que valida e responde 400 */ }

  // NF-e: identifica por `operacao` (status/autorizar), `xmlNFe` ou `uf`.
  // Upload do A1: identifica por `pfxBase64`. Sem ambiguidade entre os dois.
  const ehNfe = !corpo.pfxBase64 && (corpo.operacao || corpo.xmlNFe || corpo.uf);
  return ehNfe ? nfeTransmissao(ctx) : certificadoUpload(ctx);
};
