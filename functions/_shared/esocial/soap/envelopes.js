'use strict';

const { el } = require('../xml');
const { WS, LOTE } = require('../namespaces');

/**
 * Envelopes SOAP 1.1 dos WebServices do eSocial.
 *
 * ATENÇÃO: é SOAP 1.1 (não 1.2) — namespace do envelope
 * http://schemas.xmlsoap.org/soap/envelope/ e Content-Type text/xml.
 *
 * Os nomes de operação/parâmetro (EnviarLoteEventos/loteEventos,
 * ConsultarLoteEventos/consulta) e namespaces seguem o documentado, mas DEVEM
 * ser confirmados contra o WSDL vigente antes de transmitir.
 */

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

function envelope(corpoInterno) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    el('soapenv:Envelope', { 'xmlns:soapenv': SOAP_NS }, [
      el('soapenv:Header', []),
      el('soapenv:Body', [corpoInterno]),
    ])
  );
}

/**
 * Envelope de envio de lote.
 * @param {string} loteXml  XML do lote (montarLote) — namespace LOTE.envio.
 */
function envelopeEnviarLote(loteXml) {
  const op = el('esocial:EnviarLoteEventos', { 'xmlns:esocial': WS.enviar }, [
    el('esocial:loteEventos', [loteXml]),
  ]);
  return envelope(op);
}

/**
 * Envelope de consulta de resultado de processamento por protocolo.
 * @param {string} protocolo
 */
function envelopeConsultarLote(protocolo) {
  if (!protocolo) throw new Error('protocolo é obrigatório para consulta');
  const consultaXml = el('eSocial', { xmlns: LOTE.consulta }, [
    el('consultaLoteEventos', [el('protocoloEnvio', protocolo)]),
  ]);
  const op = el('esocial:ConsultarLoteEventos', { 'xmlns:esocial': WS.consultar }, [
    el('esocial:consulta', [consultaXml]),
  ]);
  return envelope(op);
}

module.exports = { envelope, envelopeEnviarLote, envelopeConsultarLote, SOAP_NS };
