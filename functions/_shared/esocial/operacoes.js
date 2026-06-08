'use strict';

const { getConfig } = require('../config/environment');
const { envelopeEnviarLote, envelopeConsultarLote } = require('./soap/envelopes');
const { chamarSoap } = require('./soap/cliente-soap');
const { parseRetornoEnvio, parseRetornoConsulta, parseFault } = require('./soap/respostas');

/**
 * Operações de alto nível do eSocial — escondem transporte SOAP, mTLS,
 * truststore e parsing. É a fronteira que o resto do sistema usa.
 *
 * NENHUMA delas transmite sozinha em import — só quando chamadas com material
 * de certificado real e ambiente configurado.
 */

/**
 * Envia um lote já montado e assinado; devolve protocolo + status.
 * @param {object} p
 * @param {string} p.loteXml
 * @param {{ leafPem, privateKeyPem, chainPem? }} p.material
 * @param {object} [p.env]
 * @param {object} [p.httpsModule]  injeção p/ teste
 */
async function enviarLote({ loteXml, material, env = process.env, httpsModule }) {
  const cfg = getConfig(env);
  const xmlEnvelope = envelopeEnviarLote(loteXml);
  const resp = await chamarSoap({
    url: cfg.endpoints.enviarLote,
    xmlEnvelope,
    material,
    env,
    httpsModule,
  });
  return interpretar(resp, parseRetornoEnvio);
}

/**
 * Consulta o resultado de processamento de um lote por protocolo.
 * @param {object} p
 * @param {string} p.protocolo
 * @param {{ leafPem, privateKeyPem, chainPem? }} p.material
 * @param {object} [p.env]
 * @param {object} [p.httpsModule]
 */
async function consultarLote({ protocolo, material, env = process.env, httpsModule }) {
  const cfg = getConfig(env);
  const xmlEnvelope = envelopeConsultarLote(protocolo);
  const resp = await chamarSoap({
    url: cfg.endpoints.consultarLote,
    xmlEnvelope,
    material,
    env,
    httpsModule,
  });
  return interpretar(resp, parseRetornoConsulta);
}

function interpretar(resp, parser) {
  const fault = parseFault(resp.body);
  if (fault) {
    const err = new Error(`SOAP Fault: ${fault.faultstring || fault.faultcode}`);
    err.fault = fault;
    err.httpStatus = resp.status;
    throw err;
  }
  if (resp.status >= 400) {
    const err = new Error(`HTTP ${resp.status} do WebService eSocial`);
    err.httpStatus = resp.status;
    err.body = resp.body;
    throw err;
  }
  return parser(resp.body);
}

module.exports = { enviarLote, consultarLote };
