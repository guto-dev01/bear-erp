'use strict';

/**
 * Namespaces dos schemas do eSocial, derivados da versão de leiaute.
 *
 * IMPORTANTE: a versão do leiaute vai no namespace do evento (Parte 3). O
 * governo sobe versões periodicamente, então tudo aqui é parametrizável e
 * centralizado. Os valores DEVEM ser confirmados contra os XSD/WSDL oficiais
 * antes de transmitir — não invente; o MOD é a fonte da verdade.
 *
 * Convenção de versão do evento: "S-1.3" → "S_01_03_00".
 */

/** "S-1.3" → "S_01_03_00" (major.minor → zero-padded, patch=00). */
function versaoNamespace(versaoLeiaute = 'S-1.3', patch = 0) {
  const m = String(versaoLeiaute).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) throw new Error(`versaoLeiaute inválida: ${versaoLeiaute}`);
  const major = m[1].padStart(2, '0');
  const minor = m[2].padStart(2, '0');
  const pat = String(m[3] ?? patch).padStart(2, '0');
  return `S_${major}_${minor}_${pat}`;
}

/** Namespace de um evento específico (ex.: 'evtInfoEmpregador'). */
function nsEvento(aliasEvento, versaoLeiaute, { override } = {}) {
  if (override) return override;
  const v = versaoNamespace(versaoLeiaute);
  return `http://www.esocial.gov.br/schema/evt/${aliasEvento}/v_${v}`;
}

/**
 * Namespaces do lote de envio e da consulta. As versões do schema de LOTE são
 * independentes da versão do leiaute dos eventos — confirme no WSDL vigente.
 */
const LOTE = Object.freeze({
  // Schema do XML de envio de lote de eventos.
  envio: process.env.ESOCIAL_NS_LOTE_ENVIO ||
    'http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1',
  // Schema de retorno do processamento de lote.
  retornoProcessamento: process.env.ESOCIAL_NS_LOTE_RETORNO ||
    'http://www.esocial.gov.br/schema/lote/eventos/envio/retornoProcessamento/v1_1_0',
  // Schema de consulta de lote por protocolo.
  consulta: process.env.ESOCIAL_NS_LOTE_CONSULTA ||
    'http://www.esocial.gov.br/schema/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0',
});

/** Namespaces SOAP dos WebServices (envelope/operação). Confirme no WSDL. */
const WS = Object.freeze({
  enviar: process.env.ESOCIAL_NS_WS_ENVIAR ||
    'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0',
  consultar: process.env.ESOCIAL_NS_WS_CONSULTAR ||
    'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0',
});

module.exports = { versaoNamespace, nsEvento, LOTE, WS };
