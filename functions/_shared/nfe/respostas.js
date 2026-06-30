'use strict';

const { DOMParser } = require('@xmldom/xmldom');

/**
 * Parser tolerante das respostas dos WebServices da NF-e.
 *
 * Busca por local-name (ignora prefixos/namespaces), porque os retornos vêm
 * aninhados em envelope SOAP + schema de retorno. Campos ausentes voltam null
 * em vez de quebrar. Espelha a abordagem de `esocial/soap/respostas.js`.
 */

function porLocalName(node, localName) {
  const out = [];
  const todos = node.getElementsByTagName('*');
  for (let i = 0; i < todos.length; i++) {
    const n = todos[i];
    if ((n.localName || n.nodeName.replace(/^.*:/, '')) === localName) out.push(n);
  }
  return out;
}

function texto(node, localName) {
  const els = porLocalName(node, localName);
  return els.length ? (els[0].textContent || '').trim() : null;
}

function parse(xml) {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

/**
 * Classifica o cStat da NF-e numa situação de negócio.
 *  - 100/150 autorizada; 110/205/301/302/303 denegada;
 *  - 103/104/105 lote em processamento; não-numérico → erro; resto → rejeitada.
 */
function classificarStatus(cStat) {
  const c = Number(cStat);
  if (!Number.isFinite(c)) return 'ERRO';
  if (c === 100 || c === 150) return 'AUTORIZADA';
  if ([110, 205, 301, 302, 303].includes(c)) return 'DENEGADA';
  if ([103, 104, 105].includes(c)) return 'PROCESSANDO';
  return 'REJEITADA';
}

/**
 * Retorno do NFeAutorizacao4. No modo síncrono (indSinc=1) o `protNFe/infProt`
 * traz o resultado da NF-e; o cStat do protocolo tem prioridade sobre o do lote.
 * @param {string} xml
 */
function parseRetornoAutorizacao(xml) {
  const doc = parse(xml);
  const protNFe = porLocalName(doc, 'protNFe')[0];
  const infProt = protNFe ? porLocalName(protNFe, 'infProt')[0] : null;

  const cStatProt = infProt ? texto(infProt, 'cStat') : null;
  const cStatLote = texto(doc, 'cStat'); // primeiro cStat = do retEnviNFe (lote)
  const cStat = cStatProt || cStatLote;

  return {
    cStat: cStat != null ? Number(cStat) : null,
    xMotivo: (infProt ? texto(infProt, 'xMotivo') : null) || texto(doc, 'xMotivo'),
    nProt: infProt ? texto(infProt, 'nProt') : null,
    chNFe: infProt ? texto(infProt, 'chNFe') : null,
    dhRecbto: infProt ? texto(infProt, 'dhRecbto') : null,
    nRec: texto(doc, 'nRec'), // presente no modo assíncrono (lote recebido)
    situacao: classificarStatus(cStat),
    bruto: xml,
  };
}

/**
 * Retorno do NFeStatusServico4. cStat 107 = "Serviço em Operação".
 * @param {string} xml
 */
function parseRetornoStatusServico(xml) {
  const doc = parse(xml);
  const cStat = texto(doc, 'cStat');
  return {
    cStat: cStat != null ? Number(cStat) : null,
    xMotivo: texto(doc, 'xMotivo'),
    tpAmb: texto(doc, 'tpAmb'),
    online: Number(cStat) === 107,
    bruto: xml,
  };
}

/** Detecta um soap:Fault no envelope. */
function parseFault(xml) {
  const doc = parse(xml);
  const fault = porLocalName(doc, 'Fault')[0];
  if (!fault) return null;
  return {
    faultcode: texto(fault, 'faultcode') || texto(fault, 'Code'),
    faultstring: texto(fault, 'faultstring') || texto(fault, 'Reason'),
  };
}

module.exports = {
  classificarStatus,
  parseRetornoAutorizacao,
  parseRetornoStatusServico,
  parseFault,
};
