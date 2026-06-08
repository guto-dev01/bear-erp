'use strict';

const { DOMParser } = require('@xmldom/xmldom');

/**
 * Parser tolerante das respostas do eSocial (envio e consulta).
 *
 * Usa busca por local-name (ignora prefixos/namespaces), porque os retornos
 * vêm aninhados em envelope SOAP + schema de retorno. Extrai os campos que o
 * controle de estado precisa: código/descrição da resposta, protocolo, recibo
 * e ocorrências (erros de schema/negócio).
 *
 * Não confia em posição fixa — os nomes de tag DEVEM bater com o leiaute de
 * retorno vigente; campos ausentes voltam null em vez de quebrar.
 */

function texto(node, localName) {
  const els = porLocalName(node, localName);
  return els.length ? (els[0].textContent || '').trim() : null;
}

function porLocalName(node, localName) {
  const out = [];
  const todos = node.getElementsByTagName('*');
  for (let i = 0; i < todos.length; i++) {
    const n = todos[i];
    if ((n.localName || n.nodeName.replace(/^.*:/, '')) === localName) out.push(n);
  }
  return out;
}

function parse(xml) {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

/**
 * Resposta do EnviarLoteEventos. Retorna protocolo + status do recebimento.
 * @param {string} xml
 */
function parseRetornoEnvio(xml) {
  const doc = parse(xml);
  const cdResposta = texto(doc, 'cdResposta');
  return {
    cdResposta: cdResposta != null ? Number(cdResposta) : null,
    descResposta: texto(doc, 'descResposta'),
    protocolo: texto(doc, 'protocoloEnvio') || texto(doc, 'protocolo'),
    ocorrencias: extrairOcorrencias(doc),
    bruto: xml,
  };
}

/**
 * Resposta do ConsultarLoteEventos. Retorna status do processamento, recibo e
 * ocorrências por evento.
 * @param {string} xml
 */
function parseRetornoConsulta(xml) {
  const doc = parse(xml);
  const cdResposta = texto(doc, 'cdResposta');
  return {
    cdResposta: cdResposta != null ? Number(cdResposta) : null,
    descResposta: texto(doc, 'descResposta'),
    protocolo: texto(doc, 'protocoloEnvio') || texto(doc, 'protocolo'),
    recibo: texto(doc, 'nrRecibo') || texto(doc, 'recibo'),
    ocorrencias: extrairOcorrencias(doc),
    bruto: xml,
  };
}

/** Coleta blocos <ocorrencia> (codigo/descricao/tipo) onde existirem. */
function extrairOcorrencias(doc) {
  const blocos = porLocalName(doc, 'ocorrencia');
  return blocos.map((b) => ({
    codigo: texto(b, 'codigo'),
    descricao: texto(b, 'descricao'),
    tipo: texto(b, 'tipo'),
    localizacao: texto(b, 'localizacaoErroAviso') || texto(b, 'localizacao'),
  }));
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

module.exports = { parseRetornoEnvio, parseRetornoConsulta, parseFault };
