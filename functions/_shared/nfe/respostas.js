'use strict';

const zlib = require('zlib');
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

/**
 * Retorno do NFeRecepcaoEvento4 (usado por manifestação / cancelamento / CC-e).
 * O status conclusivo está em `retEvento/infEvento`; o do lote em `retEnvEvento`.
 * cStat 135 = registrado e vinculado; 136 = registrado, não vinculado; 573 =
 * evento em duplicidade (já registrado antes) → tratamos como sucesso.
 * @param {string} xml
 */
function parseRetornoEvento(xml) {
  const doc = parse(xml);
  const infEvento = porLocalName(doc, 'infEvento').filter((n) => porLocalName(n, 'cStat').length)[0] || null;
  const cStat = infEvento ? texto(infEvento, 'cStat') : texto(doc, 'cStat');
  const c = Number(cStat);
  return {
    cStat: cStat != null ? Number(cStat) : null,
    xMotivo: (infEvento ? texto(infEvento, 'xMotivo') : null) || texto(doc, 'xMotivo'),
    nProt: infEvento ? texto(infEvento, 'nProt') : null,
    dhRegEvento: infEvento ? texto(infEvento, 'dhRegEvento') : null,
    registrado: [135, 136, 573].includes(c),
    bruto: xml,
  };
}

/**
 * Retorno do NFeDistribuicaoDFe (`retDistDFeInt`). Descompacta cada `docZip`
 * (base64 → gzip → XML). cStat 138 = documento(s) localizado(s); 137 = nenhum;
 * 656 = consumo indevido (respeitar o intervalo de ~1h por CNPJ).
 * @param {string} xml
 * @returns {{ cStat, xMotivo, ultNSU, maxNSU, dhResp, temMais, documentos: Array<{nsu,schema,tipo,xml}> }}
 */
function parseRetornoDistribuicao(xml) {
  const doc = parse(xml);
  const ret = porLocalName(doc, 'retDistDFeInt')[0];
  if (!ret) throw new Error('Resposta sem retDistDFeInt');

  const ultNSU = texto(ret, 'ultNSU');
  const maxNSU = texto(ret, 'maxNSU');
  const documentos = porLocalName(ret, 'docZip').map((dz) => {
    const b64 = (dz.textContent || '').trim();
    const schema = dz.getAttribute ? dz.getAttribute('schema') || '' : '';
    return {
      nsu: dz.getAttribute ? dz.getAttribute('NSU') || '' : '',
      schema,
      tipo: schema.split('_')[0],
      xml: b64 ? zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8') : '',
    };
  });

  return {
    cStat: texto(ret, 'cStat') != null ? Number(texto(ret, 'cStat')) : null,
    xMotivo: texto(ret, 'xMotivo'),
    ultNSU,
    maxNSU,
    dhResp: texto(ret, 'dhResp'),
    temMais: Number(ultNSU) < Number(maxNSU),
    documentos,
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
  parseRetornoEvento,
  parseRetornoDistribuicao,
  parseFault,
};
