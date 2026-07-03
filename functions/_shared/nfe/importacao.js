'use strict';

const fs = require('fs');
const path = require('path');
const { carregarCertificado } = require('../certificado/certificado-service');
const { chamarSoap } = require('../esocial/soap/cliente-soap');
const { assinarElemento } = require('./assinatura');
const {
  montarDistDFeInt,
  envelopeDistribuicao,
  montarEnvEvento,
  envelopeEvento,
} = require('./soap');
const { montarEventoManifestacao } = require('./eventos');
const { parseRetornoDistribuicao, parseRetornoEvento, parseFault } = require('./respostas');
const { urlWebService, urlPorAutorizador, cufDaUf } = require('./webservices');
const { criarLogger } = require('../log/logger');

/**
 * Orquestrador de ENTRADA da NF-e (o que o bear não tinha): captura via
 * Distribuição DF-e e Manifestação do Destinatário. Simétrico a transmissao.js
 * (SAÍDA). Reusa o mesmo cofre (A1), a mesma assinatura XMLDSig e o mesmo
 * transporte mTLS. Injetável (cofre/httpsModule/env) → testável sem rede.
 *
 * Distribuição DF-e e Manifestação usam o AMBIENTE NACIONAL (Receita Federal):
 * distribuição pelo serviço nacional; manifestação pelo RecepcaoEvento do AN
 * (cOrgao 91). A `cUFAutor` da distribuição é a UF do autor da consulta.
 */

const log = criarLogger('nfe:importacao');

// Cadeia da AC SERPRO (hosts da Distribuição DF-e do Ambiente Nacional). Lida
// uma vez; se ausente, seguimos só com as raízes públicas (cobre a manifestação
// via Let's Encrypt, mas a distribuição pode falhar no TLS — ver certs/README).
const AN_CA_PATH = path.join(__dirname, 'certs', 'an-ca.pem');
let AN_CA_EXTRA = [];
try {
  const pem = fs.readFileSync(AN_CA_PATH, 'utf8');
  if (pem.includes('BEGIN CERTIFICATE')) AN_CA_EXTRA = [pem];
} catch { /* opcional */ }

const CSTAT_DOCUMENTOS = 138;      // documento(s) localizado(s)
const CSTAT_SEM_DOCUMENTOS = 137;  // nenhum documento novo
const CSTAT_CONSUMO_INDEVIDO = 656; // aguarde ~1h por CNPJ

/** dhEvento no formato exigido (ISO 8601 com fuso -03:00). */
function dhAgora(agora = new Date()) {
  const off = -3 * 60;
  const local = new Date(agora.getTime() + off * 60 * 1000);
  const s = local.toISOString().replace(/\.\d{3}Z$/, '');
  return `${s}-03:00`;
}

/**
 * UMA consulta à Distribuição DF-e (por ultNSU, nsu ou chNFe).
 * @returns {Promise<ReturnType<typeof parseRetornoDistribuicao>>}
 */
async function baixarDistribuicao({
  cofre,
  empresaId,
  uf,
  cnpjCpf,
  ultNSU,
  nsu,
  chNFe,
  ambiente = 'homologacao',
  truststoreEstrito = true,
  env = process.env,
  httpsModule,
}) {
  const url = urlWebService(uf, 'NFeDistribuicaoDFe', ambiente);
  if (!url) throw new Error(`Sem endpoint NFeDistribuicaoDFe (ambiente ${ambiente})`);
  const cUFAutor = cufDaUf(uf);
  if (!cUFAutor) throw new Error(`UF inválida: ${uf}`);

  const { metadados, material } = await carregarCertificado(cofre, empresaId);
  if (metadados.vencido) throw new Error(`Certificado da empresa ${empresaId} vencido em ${metadados.validoAte}`);
  const doc = cnpjCpf || metadados.cnpjCpf;
  if (!doc) throw new Error('cnpjCpf do interessado não informado e ausente no certificado');

  const distDFeInt = montarDistDFeInt({
    tpAmb: ambiente === 'producao' ? '1' : '2',
    cUFAutor,
    cnpjCpf: doc,
    ultNSU,
    nsu,
    chNFe,
  });
  const { xmlEnvelope, soapAction } = envelopeDistribuicao(distDFeInt);
  const resp = await chamarSoap({
    url, xmlEnvelope, material, soapAction,
    truststoreEstrito, anexarCadeiaCliente: false,
    caExtra: AN_CA_EXTRA, incluirRaizesPadrao: true, // AN usa CA SERPRO + (fallback) raízes públicas
    env, httpsModule,
  });
  const fault = parseFault(resp.body);
  if (fault) throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultcode}`);
  return parseRetornoDistribuicao(resp.body);
}

/**
 * Loop completo: consulta por NSU até esgotar (ultNSU >= maxNSU) ou bater
 * `maxIteracoes`. Persista o `ultNSU` devolvido e reuse na próxima execução.
 * @returns {Promise<{ documentos, ultNSU, maxNSU, cStat, xMotivo }>}
 */
async function baixarNovos({ maxIteracoes = 50, ultNSU = '0', ...p }) {
  const documentos = [];
  let ult = String(ultNSU);
  let maxNSU = '0';
  let cStat = null;
  let xMotivo = '';

  for (let i = 0; i < maxIteracoes; i++) {
    const r = await baixarDistribuicao({ ...p, ultNSU: ult });
    cStat = r.cStat;
    xMotivo = r.xMotivo;
    maxNSU = r.maxNSU || maxNSU;

    if (r.cStat === CSTAT_CONSUMO_INDEVIDO) {
      throw new Error('Consumo indevido (cStat 656): aguarde ~1h entre consultas sem documentos novos.');
    }
    if (r.cStat !== CSTAT_DOCUMENTOS && r.cStat !== CSTAT_SEM_DOCUMENTOS) {
      throw new Error(`Distribuição DF-e falhou: ${r.cStat} ${r.xMotivo}`);
    }

    documentos.push(...r.documentos);
    if (r.ultNSU) ult = r.ultNSU;
    if (r.cStat === CSTAT_SEM_DOCUMENTOS || !r.temMais) break;
  }

  log.info('Distribuição DF-e concluída', { empresaId: p.empresaId, baixados: documentos.length, ultNSU: ult, maxNSU });
  return { documentos, ultNSU: ult, maxNSU, cStat, xMotivo };
}

/**
 * Manifestação do Destinatário (210200/210210/210220/210240). Assina o evento
 * com o A1 do cofre e envia ao RecepcaoEvento do Ambiente Nacional.
 * @returns {Promise<ReturnType<typeof parseRetornoEvento>>}
 */
async function manifestarDestinatario({
  cofre,
  empresaId,
  chave,
  cnpj,
  tpEvento,
  xJust,
  ambiente = 'homologacao',
  nSeqEvento = 1,
  dhEvento,
  truststoreEstrito = true,
  env = process.env,
  httpsModule,
}) {
  const url = urlPorAutorizador('AN', 'NFeRecepcaoEvento4', ambiente);
  if (!url) throw new Error(`Sem endpoint NFeRecepcaoEvento4 do AN (ambiente ${ambiente})`);

  const { metadados, material } = await carregarCertificado(cofre, empresaId);
  if (metadados.vencido) throw new Error(`Certificado da empresa ${empresaId} vencido em ${metadados.validoAte}`);
  const doc = cnpj || metadados.cnpjCpf;
  if (!doc) throw new Error('CNPJ do destinatário não informado e ausente no certificado');

  const evento = montarEventoManifestacao({
    chave,
    cnpj: doc,
    tpEvento,
    xJust,
    nSeqEvento,
    tpAmb: ambiente === 'producao' ? '1' : '2',
    dhEvento: dhEvento || dhAgora(),
  });
  const eventoAssinado = assinarElemento(evento, 'infEvento', material);
  const { xmlEnvelope, soapAction } = envelopeEvento(montarEnvEvento(eventoAssinado, { idLote: '1' }));

  const resp = await chamarSoap({
    url, xmlEnvelope, material, soapAction,
    truststoreEstrito, anexarCadeiaCliente: false,
    caExtra: AN_CA_EXTRA, incluirRaizesPadrao: true, // RecepcaoEvento do AN usa Let's Encrypt
    env, httpsModule,
  });
  const fault = parseFault(resp.body);
  if (fault) throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultcode}`);
  const r = parseRetornoEvento(resp.body);
  log.info('Manifestação enviada', { empresaId, chave, tpEvento, cStat: r.cStat, registrado: r.registrado });
  return r;
}

module.exports = { baixarDistribuicao, baixarNovos, manifestarDestinatario, dhAgora };
