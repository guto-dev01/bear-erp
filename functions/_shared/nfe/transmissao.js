'use strict';

const { carregarCertificado } = require('../certificado/certificado-service');
const { chamarSoap } = require('../esocial/soap/cliente-soap');
const { assinarNfe } = require('./assinatura');
const { montarEnviNFe, envelopeAutorizacao, envelopeStatusServico } = require('./soap');
const { parseRetornoAutorizacao, parseRetornoStatusServico, parseFault } = require('./respostas');
const { urlWebService, cufDaUf } = require('./webservices');
const { criarLogger } = require('../log/logger');

/**
 * Orquestrador de transmissão da NF-e: cofre → assinar (A1) → enviNFe →
 * envelope SOAP → mTLS → parse do retorno.
 *
 * Tudo injetável (cofre, httpsModule, env) — testável sem rede/Appwrite com um
 * A1 de teste (ver __tests__). NÃO transmite nada em import; só quando chamado
 * com material real e ambiente. Mantém a chave privada fora de qualquer log.
 */

const log = criarLogger('nfe:transmissao');

/**
 * Autoriza uma NF-e (modo síncrono). Recebe o XML NÃO assinado (do gerador do
 * front) e devolve a situação + protocolo.
 *
 * @param {object} p
 * @param {{ carregar(empresaId: string): Promise<{pfx: Buffer, senha: string}> }} p.cofre
 * @param {string} p.empresaId
 * @param {string} p.uf                 UF do emitente (define o autorizador)
 * @param {string} p.xmlNFe             XML `<NFe>…</NFe>` não assinado
 * @param {'producao'|'homologacao'} [p.ambiente='homologacao']
 * @param {string|number} [p.idLote='1']
 * @param {boolean} [p.truststoreEstrito=true]  em produção, exige a cadeia Sectigo
 * @param {object} [p.env=process.env]
 * @param {object} [p.httpsModule]      injeção p/ teste
 * @returns {Promise<{ cStat, xMotivo, nProt, chNFe, situacao, xmlAssinado, url }>}
 */
async function transmitirNfe({
  cofre,
  empresaId,
  uf,
  xmlNFe,
  ambiente = 'homologacao',
  idLote = '1',
  truststoreEstrito = true,
  env = process.env,
  httpsModule,
}) {
  if (!xmlNFe) throw new Error('xmlNFe é obrigatório');
  const url = urlWebService(uf, 'NFeAutorizacao4', ambiente);
  if (!url) throw new Error(`Sem endpoint NFeAutorizacao4 para UF ${uf} (ambiente ${ambiente})`);

  // 1) Cofre → material do A1 (chave privada p/ assinar + cadeia p/ mTLS).
  const { metadados, material } = await carregarCertificado(cofre, empresaId);
  if (metadados.vencido) {
    throw new Error(`Certificado da empresa ${empresaId} vencido em ${metadados.validoAte}`);
  }
  if (metadados.alerta) {
    log.warn('Certificado próximo do vencimento', { empresaId, diasParaVencer: metadados.diasParaVencer });
  }

  // 2) Assinar → 3) montar enviNFe → 4) envelopar.
  const xmlAssinado = assinarNfe(xmlNFe, material);
  const enviNFe = montarEnviNFe(xmlAssinado, { idLote, indSinc: '1' });
  const { xmlEnvelope, soapAction } = envelopeAutorizacao(enviNFe);

  // 5) Transmitir (mTLS) e interpretar.
  const resp = await chamarSoap({ url, xmlEnvelope, material, soapAction, truststoreEstrito, env, httpsModule });
  const fault = parseFault(resp.body);
  if (fault) throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultcode}`);

  const retorno = parseRetornoAutorizacao(resp.body);
  log.info('NF-e transmitida', {
    empresaId, uf, ambiente, situacao: retorno.situacao, cStat: retorno.cStat, nProt: retorno.nProt,
  });
  return { ...retorno, xmlAssinado, url };
}

/**
 * Consulta o status do serviço da SEFAZ (o "ping" antes de emitir). Útil para
 * validar A1 + mTLS sem mandar nota.
 *
 * @param {object} p
 * @param {object} p.cofre
 * @param {string} p.empresaId
 * @param {string} p.uf
 * @param {'producao'|'homologacao'} [p.ambiente='homologacao']
 * @param {boolean} [p.truststoreEstrito=true]
 * @param {object} [p.env]
 * @param {object} [p.httpsModule]
 * @returns {Promise<{ cStat, xMotivo, online }>}
 */
async function statusServico({
  cofre,
  empresaId,
  uf,
  ambiente = 'homologacao',
  truststoreEstrito = true,
  env = process.env,
  httpsModule,
}) {
  const url = urlWebService(uf, 'NFeStatusServico4', ambiente);
  if (!url) throw new Error(`Sem endpoint NFeStatusServico4 para UF ${uf} (ambiente ${ambiente})`);
  const cUF = cufDaUf(uf);
  if (!cUF) throw new Error(`UF inválida: ${uf}`);

  const { material } = await carregarCertificado(cofre, empresaId);
  const { xmlEnvelope, soapAction } = envelopeStatusServico({
    cUF,
    tpAmb: ambiente === 'producao' ? '1' : '2',
  });
  const resp = await chamarSoap({ url, xmlEnvelope, material, soapAction, truststoreEstrito, env, httpsModule });
  const fault = parseFault(resp.body);
  if (fault) throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultcode}`);
  return parseRetornoStatusServico(resp.body);
}

module.exports = { transmitirNfe, statusServico };
